const {
	highEngagementLowFollowers,
	inconsistentEngagementNumbers,
	hugeFollowingLowEngagement,
	lotsOffViewsNoLikes
} = require('./engagementScores');
const request = require('request')
const { promisify } = require('util')
const requestAsync = promisify(request)
const getFollowingCountScore = require('./followingCountScore').getFollowingCountScore;
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
function isInstagramBot (data) {
	console.log('');
	console.log('');
	console.log('Instagram scores :');
	console.log(`      Followers count : ${data.graphql.user.edge_followed_by.count}`);
	console.log(`      Following count : ${data.graphql.user.edge_follow.count}`);
	console.log(`      Posts count : ${data.graphql.user.edge_owner_to_timeline_media.count}`);

	var posts = data.graphql.user.edge_owner_to_timeline_media.edges;
	var likesCount = 0,
		commentsCount = 0;

	for (var i = 0; i < posts.length; i++) {
		likesCount += posts[i].node.edge_liked_by.count;
		commentsCount += posts[i].node.edge_media_to_comment.count;
	}

	var likesMean = likesCount / posts.length;
	var commentsMean = commentsCount / posts.length;

	console.log(`      Likes mean : ${likesMean.toFixed(2)} Comments mean : ${commentsMean.toFixed(2)}`);
	console.log('');
	console.log('');
	let highEngagementLowFollowersScore = highEngagementLowFollowers(data);
	let getFollowingCountScoreRes = getFollowingCountScore(data);
	let hugeFollowingLowEngagementScore = hugeFollowingLowEngagement(data);
	let lotsOffViewsNoLikesScore = lotsOffViewsNoLikes(data);
	let inconsistentEngagementNumbersScore = inconsistentEngagementNumbers(data);

	// console.log('Instagram scores :');
	// console.log(`      highEngagementLowFollowersScore :  ${highEngagementLowFollowersScore}`);
	// console.log(`      getFollowingCountScore :           ${getFollowingCountScoreRes}`);
	// console.log(`      hugeFollowingLowEngagement :       ${hugeFollowingLowEngagementScore}`);
	// console.log(`      lotsOffViewsNoLikes :              ${lotsOffViewsNoLikesScore}`);
	// console.log(`      inconsistentEngagementNumbers :    ${inconsistentEngagementNumbersScore}`);

	let score =
		highEngagementLowFollowersScore +
		getFollowingCountScoreRes +
		hugeFollowingLowEngagementScore +
		lotsOffViewsNoLikes +
		inconsistentEngagementNumbersScore;

	if (score > 60) return true;
	return false;
};
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
module.exports = {getInstagramResult, getInstagramFollowers}