const {
	highEngagementLowFollowers,
	inconsistentEngagementNumbers,
	hugeFollowingLowEngagement,
	lotsOffViewsNoLikes
} = require('./engagementScores');

const getFollowingCountScore = require('./followingCountScore').getFollowingCountScore;

module.exports.isInstagramBot = (data) => {
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
