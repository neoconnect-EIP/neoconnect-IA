var getCountOfTweetsPerDayMean = require('./countTweetsMeanPerDay');
var calculateRiskScoreDependingOnPostingPeriods = require('./tweetsPeriod.js');
var getStringRandomness = require('./checkHandleRandomness');
var countTweetsLikesAndRetweets = require('./countLikeRetweets');

function globalFunction(data, handle) {
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

module.exports = globalFunction;
