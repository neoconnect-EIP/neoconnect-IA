const express = require('express');
var r = require('request');
const config = require('config');
const { promisify } = require('util')
const request = promisify(r)
const { getTwitterFollowers, getTwitterResult } = require('./botCheckers/twitter_bot_checker/globalFunction');
const { getInstagramResult, getInstagramFollowers } = require('./botCheckers/ig_bot_checker/instagramGlobalScore');
// const { getFacebookResult, getFacebookNumericResult } = require('./botCheckers/facebook_bot_checker/scraper');
const existFb = require('./botCheckers/facebook_bot_checker/newFb')
const { youtubeChecker, getYoutubeNumericResult, getYoutubeFollowers } = require('./botCheckers/youtube_bot_checker/youtubeChecker');
const { getTwitchResult, getTwitchFollowers } = require('./botCheckers/twitch_bot_checker/TwitchChecker')
const { getPinterestFollowers, getPinterestResult } = require('./botCheckers/pinterest_bot_checker/PinterestChecker')
const { getTikTokFollowers, getTikTokResult } = require('./botCheckers/tiktok_bot_checker/TikTokChecker')
const swaggerUi =  require('swagger-ui-express');
const swaggerDocument =  require('./swagger.json');

const router = express.Router();
router.post('/getLinks', getLinks);
// these functions check how many followers a user got
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

// main function, checks whether given user is a bot
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
			facebookPromise = existFb(handles.facebook, checks);
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
				if (facebookPromise)
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
// checks request parameters and adds a bot if it is there
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
		isItABot(handles, checks).then(async () =>{ 
			for (let key in checks){
				if (!checks[key]['error'] && checks[key]['isBot']){
					// it is a bot
					await request({
						url: `http://168.63.65.106:8080/ia`,
						method: 'POST',
						json: {socialNetwork: key},
						headers: {
							'Authorization': '23455thdvcz4cybxvr.zcecrvx;sa3roxi5xzokpDLZx4lz;wQXEKo'
						}
					})
				}
			}
			res.json(JSON.stringify(checks)) 
		});
	else 
		res.json({error: "No platform specified"})
}
