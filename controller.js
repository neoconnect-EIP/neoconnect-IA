const express = require('express');
var Twitter = require('twitter');
var request = require('request');
const config = require('config');

var botChecker = require('./botCheckers/twitter_bot_checker/globalFunction');
const isInstagramBot = require('./botCheckers/ig_bot_checker/instagramGlobalScore').isInstagramBot;
const facebookChecker = require('./botCheckers/facebook_bot_checker/scraper').checkFacebookProfileExistence;
const youtubeChecker = require('./botCheckers/youtube_bot_checker/youtubeChecker');
const TwitchChecker = require('./botCheckers/twitch_bot_checker/TwitchChecker')
const PinterestChecker = require('./botCheckers/pinterest_bot_checker/PinterestChecker')

const swaggerUi =  require('swagger-ui-express');
const swaggerDocument =  require('./swagger.json');

const {
    promisify
} = require('util')
// Initialize request lib for async requests
const requestAsync = promisify(request.defaults({
    headers: {
        'Client-ID': config.get('twitch.client_id')
    },
    rejectUnauthorized: false
}))

const router = express.Router();
router.post('/getLinks', getLinks);

module.exports = router;

router.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


async function getPinterestResult(accessPinterest){
	const num  = await getPinterestNumerical(accessPinterest)
	let checks = {
		isBot: null,
		errors: []
	}
	switch(num){
		case 0:
			checks.isBot = false
		break
		case 1:
			checks.isBot = true
		break
		case 400:
			checks.errors.push({
				error: 'API Error',
				errorCode: 400
			})
		break
		case 500:
			checks.errors.push({
				error: 'Pinterest API Error',
				errorCode: 500
			})
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
		errors: []
	}
	switch(num){
		case 0:
			checks.isBot = false
		break
		case 1:
			checks.isBot = true
		break
		case 400:
			checks.errors.push({
				error: 'API Error',
				errorCode: 400
			})
		break
		case 500:
			checks.errors.push({
				error: 'Twitch API Error',
				errorCode: 500
			})
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

    let userData = await requestAsync(`https://api.twitch.tv/helix/users?login=${login}`)
    // if first request is successfull then all other will be
    if (userData.statusCode === 200) {
        userData = JSON.parse(userData.body).data
        if (userData.length) {
            userData = userData[0]
            let userFollowers = (await requestAsync(`https://api.twitch.tv/helix/users/follows?to_id=${userData.id}`)).body
            let userFollows = (await requestAsync(`https://api.twitch.tv/helix/users/follows?from_id=${userData.id}`)).body
            let userVideos = (await requestAsync(`https://api.twitch.tv/helix/videos?user_id=${userData.id}`)).body
            userFollowers = JSON.parse(userFollowers)
            userFollows = JSON.parse(userFollows)
            userVideos = JSON.parse(userVideos)
            // Check whether user has videos
            if (userVideos.status === 404 || !userVideos.data.length) userVideos = false
            return {
                error: false,
                data: userData,
                followers: userFollowers.total,
                follows: userFollows.total,
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
			errors: []
		};

		request(`https://www.instagram.com/${instagramHandle}/?__a=1`, function(error, response, body) {
			if (response.statusCode == 404) {
				checks.instagram.errors.push({
					error: 'Instagram handle is incorrect',
					errorCode: 400
				});
			} else if (error) {
				checks.instagram.errors.push({
					error: 'API Error',
					errorCode: 500
				});
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
			errors: []
		};

		try {
			T.get('users/show', options, function(err, data) {
				if (err != null) {
					checks.twitter.errors.push({
						error: err[0].message,
						errorCode: 400
					});
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
						checks.twitter.errors.push({
							error: 'API error',
							errorCode: 500
						});
					}
				}
			});
		} catch (err) {
			checks.twitter.errors.push({
				error: 'API error',
				errorCode: 500
			});
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
	var promise = new Promise(async (resolve) => {
		var igPromise, twitterPromise, facebookPromise, youtubePromise;
		if (handles.instagram !== null && handles.instagram !== '')
			igPromise = getInstagramResult(handles.instagram, checks);

		if (handles.twitter !== null && handles.twitter !== '')
			twitterPromise = getTwitterResult(handles.twitter, checks);

		if (handles.facebook !== null && handles.facebook !== '') {
			facebookPromise = getFacebookResult(handles.facebook, checks);
		}

		if (handles.youtubeChannelId !== null && handles.youtubeChannelId !== '') {
			youtubePromise = youtubeChecker(handles.youtubeChannelId, checks);
		}
		if(handles.twitch !== null && handles.twitch !== ''){
			twitchRes = await getTwitchResult(handles.twitch)
		}
		if (handles.pinterest !== null && handles.pinterest !== ''){
			pinterestRes = await getPinterestResult(handles.pinterest)
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
	if (req.body.twitter !== null) handles.twitter = req.body.twitter;
	if (req.body.insta !== null) handles.instagram = req.body.insta;
	if (req.body.facebook !== null) handles.facebook = req.body.facebook;
	if (req.body.youtube !== null) handles.youtubeChannelId = req.body.youtube;
	if (req.body.twitch !== null) handles.twitch = req.body.twitch
	if (req.body.pinterest !== null) handles.pinterest = req.body.pinterest
	isItABot(handles, checks).then(() => res.json(JSON.stringify(checks)));
}
