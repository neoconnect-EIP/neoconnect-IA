const express = require('express');
var Twitter = require('twitter');
var request = require('request');
const config = require('config');

var botChecker = require('./botCheckers/twitter_bot_checker/globalFunction');
const isInstagramBot = require('./botCheckers/ig_bot_checker/instagramGlobalScore').isInstagramBot;
const facebookChecker = require('./botCheckers/facebook_bot_checker/scraper').checkFacebookProfileExistence;
const youtubeChecker = require('./botCheckers/youtube_bot_checker/youtubeChecker');

const router = express.Router();
router.post('/getLinks', getLinks);

module.exports = router;

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

function isItABot(handles, checks) {
	var promise = new Promise((resolve) => {
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

		try {
			Promise.all([ igPromise, twitterPromise, facebookPromise, youtubePromise ]).then((result) => {
				console.log('');
				console.log('');
				checks.facebook = result[2];
				console.log('Results: ' + JSON.stringify(checks));
				resolve();
			});
		} catch (err) {
			console.log(err);
		}
	});

	return promise;
}

function getLinks(req, res, next) {
	var checks = {};
	var handles = {};

	if (req.body.twitter !== null) handles.twitter = req.body.twitter;
	if (req.body.insta !== null) handles.instagram = req.body.insta;
	if (req.body.facebook !== null) handles.facebook = req.body.facebook;
	if (req.body.youtube !== null) handles.youtubeChannelId = req.body.youtube;

	isItABot(handles, checks).then(() => res.json(JSON.stringify(checks)));
}
