const express = require('express');
var Twitter = require('twitter');
var request = require('request');
const config = require('config');
const tiktok_scraper = require('tiktok-scraper')


var botChecker = require('./botCheckers/twitter_bot_checker/globalFunction');
const isInstagramBot = require('./botCheckers/ig_bot_checker/instagramGlobalScore').isInstagramBot;
const facebookChecker = require('./botCheckers/facebook_bot_checker/scraper').checkFacebookProfileExistence;
const youtubeChecker = require('./botCheckers/youtube_bot_checker/youtubeChecker');
const TwitchChecker = require('./botCheckers/twitch_bot_checker/TwitchChecker')
const PinterestChecker = require('./botCheckers/pinterest_bot_checker/PinterestChecker')
const TikTokChecker = require('./botCheckers/tiktok_bot_checker/TikTokChecker')
const swaggerUi =  require('swagger-ui-express');
const swaggerDocument =  require('./swagger.json');

const {
    promisify
} = require('util')
// Initialize request lib for async requests
const requestAsyncTwitch = promisify(request.defaults({
    headers: {
		'Accept': 'application/vnd.twitchtv.v5+json',
        'Client-ID': config.get('twitch.client_id')
    },
    rejectUnauthorized: false
}))
const requestAsync = promisify(request)
const router = express.Router();
router.post('/getLinks', getLinks);
router.post('/followersTikTok', async (req,res) => {
	if('username' in req.body){
		const tik = await getTikTokFollowers(req.body.username)
		if (tik)
			res.json({success: true, tiktok: {followers: tik}})
		else res.json({success: false})
	}else res.json({success: false})
})
router.post('/followersPinterest', async (req,res) => {
	if('token' in req.body){
		const data = await getPinterestFollowers(req.body.token)
		if (data)
			res.json({success: true, pinterest: {followers: data}})
		else res.json({success: false})
	}else res.json({success: false})
})
router.post('/followersTwitch', async (req,res) => {
	if('username' in req.body){
		const data = await getTwitchFollowers(req.body.username)
		if (data)
			res.json({success: true, twitch: {followers: data}})
		else res.json({success: false})
	}else res.json({success: false})
})
router.post('/followersInstagram', async (req,res) => {
	if('username' in req.body){
		const data = await getInstagramFollowers(req.body.username)
		if (data)
			res.json({success: true, ig: {followers: data}})
		else res.json({success: false})
	}else res.json({success: false})
})
router.post('/followersTwitter', async (req,res) => {
	if('username' in req.body){
		await getTwitterFollowers(req.body.username, res)
	}else res.json({success: false})
})
router.post('/followersYoutube', async (req,res) => {
	if('username' in req.body){
		const data = await getYoutubeFollowers(req.body.username)
		if (data)
			res.json({success: true, youtube: {followers: data}})
		else res.json({success: false})
	}else res.json({success: false})
})
module.exports = router;

router.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
async function getTikTokFollowers(username){
	const user = await getTikTokUserData(username)
	if (user){
		if (!user.isSecret)
			return user.fans
		else 
			return false
	}else{
		return false
	}
}
async function getPinterestFollowers(accessToken){
	const data = await pinterestGet('me/', '&fields=first_name%2Cid%2Clast_name%2Curl%2Caccount_type%2Cbio%2Ccounts%2Ccreated_at%2Cimage%2Cusername', accessPinterest)
	if (typeof data == 'number') return false
	return data.data.counts.followers
}
async function getTwitchFollowers(login){
	const user = await getTwitchUserData(login)
	if (!user.error)
		return user.followers;
	else 
		return false
}
async function getInstagramFollowers(instagramHandle){
	const data = await requestAsync(`https://www.instagram.com/${instagramHandle}/?__a=1`)
		if (data.statusCode == 404) {
			return false
		} else if (data.error) {
			return false
		}else if (data.statusCode == 200) {
			try{
				body = JSON.parse(data.body);
				return body.graphql.user.edge_followed_by.count;
			}catch(e){
				console.log(e)
				return false
			}
			
		}
}
async function getTwitterFollowers(twitter, res){
	var T = new Twitter({
		consumer_key: config.get('twitter.consumer_key'),
		consumer_secret: config.get('twitter.consumer_secret'),
		access_token_key: config.get('twitter.access_token_key'),
		access_token_secret: config.get('twitter.access_token_secret')
	});

	var options = {
		screen_name: twitter
	};
	console.log(options)

	try {
		T.get('users/show', options, function(err, data) {
			if (err != null) {
				console.log(err)
				res.json({success: false})
			} else {
				console.log('');
				console.log('');
				console.log('Twitter : ');
				res.json({success: true, twitter: {followers: data.followers_count}});
			}
		})
	}catch(e){
		res.json({success: false})
	}
}
async function getYoutubeFollowers(channel){
	//data.items[0].statistics.subscriberCount
	let search = await requestAsync(`https://www.googleapis.com/youtube/v3/search?channelType=any&q=${channel}&type=channel&part=snippet&key=${config.get('youtube.apiKey')}`)
	if (search.statusCode == 200){
		search = JSON.parse(search.body)
		if (search.items.length){
			const channelId = search.items[0].id.channelId
			const data = await requestAsync(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${config.get('youtube.apiKey')}`)
			if (data.statusCode == 200){
				let body = JSON.parse(data.body);
				if (body.items.length){
					return body.items[0].statistics.subscriberCount
				}else {
					return false
				}
			}else {
				console.log(body.body)
				return false
		
			}
		}
	}else return false
	
}
async function getTikTokResult(username){
	const num  = await getTikTokNumerical(username)
	let checks = {
		isBot: null,
		error: null,
		errorCode: 200
	}
	switch(num){
		case 0:
			checks.isBot = false
		break
		case 1:
			checks.isBot = true
		break
		case 400:
			checks.error = 'API Error'
			checks.errorCode = 400
		break
		case 500:
			checks.error = 'TikTok API Error'
			checks.errorCode = 500
		break
	}
	return checks
}

async function getTikTokNumerical(username) {
	const data = await getTikTokFullData(username);
	if (data){
		try{
			if (data.user.isSecret){
				return 400
			}else{
				const tikChecker = new TikTokChecker(data)
				const score = tikChecker.getFinalScore()
				if (score > 200){
					return 0 // not bot
				}else {
					return 1
				}
			}
		}catch(e){
			return 400
		}
	}else{
		return 500
	}
}
async function getTikTokFullData(username){
	const user = await getTikTokUserData(username)
	const videos = await getTikTokUserVideos(username)
	if (user && videos) {
		return {
			user,
			videos
		}
	}else{
		return false
	}
}
async function getTikTokUserData(username) {
	try {
		const data = await tiktok_scraper.getUserProfileInfo(username)
		return data
	}catch(e) {
		return false
	}
}
async function getTikTokUserVideos(userId) {
	 try {
		 const data = await tiktok_scraper.user(userId, {
			 number: 50
		 })
		 if (data.collector.length){
			 const videos = data.collector;
			let avrgPlays = 0,
				avrgShares = 0,
				avrgComms = 0;
			 videos.forEach(val => {
				avrgPlays+=val.playCount
				avrgShares+=val.shareCount
				avrgComms+=val.commentCount
			 })
			 avrgPlays = parseInt(avrgPlays / videos.length)
			 avrgShares = parseInt(avrgShares / videos.length)
			 avrgComms = parseInt(avrgComms / videos.length)
			 return {videos: true, avrgPlays, avrgShares, avrgComms}
		 }else {
			 return {videos: false}
		 }
	 }catch(e) {
		 return false
	 }
}
async function getPinterestResult(accessPinterest){
	const num  = await getPinterestNumerical(accessPinterest)
	let checks = {
		isBot: null,
		error: null,
		errorCode: 200
	}
	switch(num){
		case 0:
			checks.isBot = false
		break
		case 1:
			checks.isBot = true
		break
		case 400:
			checks.error = 'API Error'
			checks.errorCode = 400
		break
		case 500:
			checks.error = 'Pinterest API Error'
			checks.errorCode = 500
		break
	}
	return checks
}

async function getPinterestNumerical(accessPinterest){
	data = await getPinterestUserData(accessPinterest)
	if (data.error) return 500
	try{
		const pinterestChecker = new PinterestChecker(data)
		const score = pinterestChecker.getCompleteScore()
		if (score > 125) return 0
		else return 1
	}catch(e){
		console.log(e)
		return 400
	}
}

async function getPinterestUserData(accessPinterest){
	const data = await pinterestGet('me/', '&fields=first_name%2Cid%2Clast_name%2Curl%2Caccount_type%2Cbio%2Ccounts%2Ccreated_at%2Cimage%2Cusername', accessPinterest)
	if (typeof data == 'number') return {
		error: true,
		errorCode: 500
	}
	let boards = null
	let pins = null
	// Checks whether user has boards
	if (data.data.counts.boards){
		boards = await pinterestGet('me/boards', '&fields=id%2Cname%2Curl%2Ccounts%2Ccreated_at%2Cdescription%2Cimage%2Cprivacy%2Creason', accessPinterest)
		if (typeof boards == 'number') return {
			error: true,
			errorCode: 500
		}
	}
	// Checks whether user has pins
	if (data.data.counts.pins){
		pins = await pinterestGet('me/pins/', '&fields=note%2Cattribution%2Cboard%2Ccounts%2Ccreated_at%2Cmetadata', accessPinterest)
		if (typeof pins == 'number') return {
			error: true,
			errorCode: 500
		}
	}
	return {
		error: false,
		userData: data,
		boards,
		pins
	}
	
}
// Gets whatever needed endpoint from pinterest API and parses response
async function pinterestGet(endpoint, parameters, access_token){
	const requestPin = promisify(request)
	const data = await requestPin(`https://api.pinterest.com/v1/${endpoint}?access_token=${access_token}${parameters}`)
	console.log(`Request status code: ${data.statusCode}`)
	if (data.statusCode != 200)	
		return data.statusCode
	// console.log(JSON.parse(data.body))
	return JSON.parse(data.body)
}
async function getTwitchResult(login){
	const num  = await getTwitchNumericResult(login)
	let checks = {
		isBot: null,
		error: null,
		errorCode: 200
	}
	switch(num){
		case 0:
			checks.isBot = false
		break
		case 1:
			checks.isBot = true
		break
		case 400:
			checks.error = 'API Error'
			checks.errorCode = 400
			
		break
		case 500:
			checks.error = 'Twitch API Error'
			checks.errorCode = 500
		break
	}
	return checks
}

async function getTwitchNumericResult(login) {
    let checks = {
        isBot: null,
        errors: []
    }
    // Retrieves twitch user data from API 
    const userData = await getTwitchUserData(login)
    // If there's an error in retrieving returns error with it's text
    if (userData.error) {
        console.log(`Error: ${userData}`)
        return 500
    }
    console.log('Successfully retrieved user data')
    // Create an instance of TwitchChecker class with provided data
    const twitchChecker = new TwitchChecker(userData)
    try {
        // Get  score
        const score = twitchChecker.getCompleteScore()
        if (score > 100) return 0
		else return 1
    } catch (e) {
        // If there is an error return it
        console.log(e)
		return 400
    }
    return 1
}
async function getTwitchUserData(login) {
    console.log(`Getting data for ${login}`)

    let userData = await requestAsyncTwitch(`https://api.twitch.tv/kraken/users?login=${login}`)
	// if first request is successfull then all other will be
	// console.log(userData.body)
    if (userData.statusCode === 200) {
        userData = JSON.parse(userData.body).users
        if (userData.length) {
            userData = userData[0]
			let userFollows = (await requestAsyncTwitch(`https://api.twitch.tv/kraken/users/${userData._id}/follows/channels`)).body
			let  userFollowers = (await requestAsyncTwitch(`https://api.twitch.tv/kraken/channels/${userData._id}`)).body
			let userVideos = (await requestAsyncTwitch(`https://api.twitch.tv/kraken/channels/${userData._id}/videos`)).body
            userFollowers = JSON.parse(userFollowers)
            userFollows = JSON.parse(userFollows)
            userVideos = JSON.parse(userVideos)
            // Check whether user has videos
			if (userVideos.status === 404 || !userVideos._total) userVideos = false
            return {
                error: false,
                data: userData,
                followers: userFollowers.followers,
                follows: userFollows._total,
                videos: userVideos
            }
        } else return {
            error: true,
			errorCode: 500
        }
    } else return {
        error: true,
        errorCode: 500
    }
}

function getFacebookResult(facebookUsername, checks) {
	return new Promise((resolve) => {
		facebookChecker(facebookUsername).then((result) => {
			resolve(result);
		});
	});
}

function getFacebookNumericResult(facebookUsername) {
	let promise = new Promise((resolve) => {
		facebookChecker(facebookUsername).then((result) => {
			result = {
				exists: null,
				error: null,
				errorMsg: ''
			};
			resolve(result);
		});
	});

	promise.then((result) => {
		if (result.exists !== null) {
			if (result.exists === true) return 1;
			else if (result.exists === false) return 0;
		} else if (result.error.length > 0) {
			if (result.error === 500) return 500;
			else return 400;
		}
	});
}

function getInstagramResult(instagramHandle, checks) {
	var promise = new Promise((resolve) => {
		checks.instagram = {
			isBot: null,
			error: null,
			errorCode: 200
		};

		request(`https://www.instagram.com/${instagramHandle}/?__a=1`, function(error, response, body) {
			if (response.statusCode == 404) {
				checks.instagram.error = 'Instagram handle is incorrect'
				checks.instagram.errorCode = 400
			} else if (error) {
				checks.instagram.error = 'API error'
				checks.instagram.errorCode = 500
				resolve();
			} else if (response.statusCode == 200) {
				body = JSON.parse(body);
				checks.instagram.isBot = isInstagramBot(body);
			}

			resolve();
		});
	});
	return promise;
}

async function getInstagramNumericResult(instagramHandle) {
	let checks = {};
	await getInstagramResult(instagramHandle, checks);

	if (checks.instagram.isBot !== null) {
		if (checks.instagram.isBot === true) return 1;

		if (checks.instagram.isBot === false) return 0;
	} else if (checks.instagram.errors.length > 0) {
		if (checks.instagram.errors[0].errorCode === 500) return 500;
		else return 400;
	}
}

async function getYoutubeNumericResult(channelId) {
	let checks = {};
	await youtubeChecker(channelId, checks);

	if (checks.youtube.isBot !== null) {
		if (checks.youtube.isBot === true) return 1;

		if (checks.youtube.isBot === false) return 0;
	} else if (checks.youtube.errors.length > 0) {
		if (checks.youtube.errors[0].errorCode === 500) return 500;
		else return 400;
	}
}

function getTwitterResult(twitter, checks) {
	var promise = new Promise((resolve, reject) => {
		var T = new Twitter({
			consumer_key: config.get('twitter.consumer_key'),
			consumer_secret: config.get('twitter.consumer_secret'),
			access_token_key: config.get('twitter.access_token_key'),
			access_token_secret: config.get('twitter.access_token_secret')
		});

		var options = {
			screen_name: twitter
		};

		checks.twitter = {
			isBot: null,
			error: null,
			errorCode: 200
		};

		try {
			T.get('users/show', options, function(err, data) {
				if (err != null) {
					checks.twitter.error = err[0].message
					checks.twitter.errorCode = 400;
					resolve();
				} else {
					console.log('');
					console.log('');
					console.log('Twitter : ');
					console.log(`      Followers count : ${data.followers_count}`);
					console.log(`      Tweets count : ${data.statuses_count}`);

					try {
						T.get('statuses/user_timeline', options, function(err, data) {
							if (botChecker(data, twitter) > 60) {
								checks.twitter.isBot = true;
								resolve();
							} else {
								checks.twitter.isBot = false;
								resolve();
							}
						});
					} catch (err) {
						checks.twitter.error = 'API error'
						checks.twitter.errorCode = 500
					}
				}
			});
		} catch (err) {
			checks.twitter.error = 'API error'
			checks.twitter.errorCode = 500
		}
	});
	return promise;
}

async function getTwitterNumericResult(twitterHandle) {
	let checks = {};
	await getTwitterResult(twitterHandle, checks);

	if (checks.twitter.isBot !== null) {
		if (checks.twitter.isBot === true) return 1;

		if (checks.twitter.isBot === false) return 0;
	} else if (checks.twitter.errors.length > 0) {
		if (checks.twitter.errors[0].errorCode === 500) return 500;
		else return 400;
	}
}

async function isItABot(handles, checks) {
	let twitchRes = null;
	let pinterestRes = null;
	let tiktokRes = null
	var promise = new Promise(async (resolve) => {
		var igPromise, twitterPromise, facebookPromise, youtubePromise;
		if ('insta' in handles)
			igPromise = getInstagramResult(handles.insta, checks);

		if ('twitter' in handles)
			twitterPromise = getTwitterResult(handles.twitter, checks);

		if ('facebook' in handles) {
			facebookPromise = getFacebookResult(handles.facebook, checks);
		}

		if ('youtubeChannelId' in handles) {
			youtubePromise = youtubeChecker(handles.youtubeChannelId, checks);
		}
		if('twitch' in handles){
			twitchRes = await getTwitchResult(handles.twitch)
		}
		if ('pinterest' in handles){
			pinterestRes = await getPinterestResult(handles.pinterest)
		}
		if ('tiktok' in handles){
			tiktokRes = await getTikTokResult(handles.tiktok)
		}
		try {
			Promise.all([ igPromise, twitterPromise, facebookPromise, youtubePromise ]).then((result) => {
				console.log('');
				console.log('');
				checks.facebook = result[2];
				if(twitchRes){
					checks.twitch = twitchRes
				}
				if (pinterestRes)
					checks.pinterest = pinterestRes
				if (tiktokRes) 
					checks.tiktok = tiktokRes
				console.log('Results: ' + JSON.stringify(checks));
				resolve();
			});
		} catch (err) {
			console.log(err);
		}
	});

	return promise;
}

async function getLinks(req, res, next) {
	var checks = {};
	var handles = {};
	console.log(req.body)
	if ('twitter' in req.body) handles.twitter = req.body.twitter;
	if ('insta'  in req.body) handles.insta = req.body.insta;
	if ('facebook'  in req.body) handles.facebook = req.body.facebook;
	if ('youtube'  in req.body) handles.youtubeChannelId = req.body.youtube;
	if ('twitch'  in req.body) handles.twitch = req.body.twitch
	if ('pinterest'  in req.body) handles.pinterest = req.body.pinterest
	if ('tiktok' in req.body) handles.tiktok = req.body.tiktok
	if (Object.keys(handles).length)
		isItABot(handles, checks).then(() => res.json(JSON.stringify(checks)));
	else 
		res.json({error: "No platform specified"})
}
