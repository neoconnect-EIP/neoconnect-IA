var getCountOfTweetsPerDayMean = require('./countTweetsMeanPerDay');
var calculateRiskScoreDependingOnPostingPeriods = require('./tweetsPeriod.js');
var getStringRandomness = require('./checkHandleRandomness');
var countTweetsLikesAndRetweets = require('./countLikeRetweets');
var Twitter = require('twitter');
const config = require('config');

function botChecker(data, handle) {
	var likesRetweetsObj = countTweetsLikesAndRetweets(data);

	var globalRisk =
		(calculateRiskScoreDependingOnPostingPeriods(data) +
			getCountOfTweetsPerDayMean(data) +
			getStringRandomness(handle)) /
		3;

	console.log('');
	console.log('');
	console.log('Twitter :');
	console.log(`      global risk : ${globalRisk}`);

	console.log(`      Likes : ${likesRetweetsObj.likes} Retweets : ${likesRetweetsObj.retweets}`);

	if (globalRisk > 60) return true;
	return false;
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
module.exports = { getTwitterFollowers, getTwitterResult };
