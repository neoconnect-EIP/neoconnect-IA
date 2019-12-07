module.exports.highEngagementLowFollowers = (data) => {
	var postsArray = data.graphql.user.edge_owner_to_timeline_media.edges;
	var followersCount = data.graphql.user.edge_followed_by.count;
	var mean = 0;

	for (var i = 0; i < postsArray.length; i++) {
		mean += postsArray[i].node.edge_liked_by.count / followersCount;
	}

	mean /= postsArray.length;

	if (mean > 1) return 100;
	mean *= 100;
	console.log('      highEngagementLowFollowers : ' + mean.toFixed(2));
	return mean;
};

module.exports.inconsistentEngagementNumbers = (data) => {
	var postsArray = data.graphql.user.edge_owner_to_timeline_media.edges;
	var likesMean = 0;
	var commentsMean = 0;
	var likesScore = 0,
		commentsScore = 0;

	for (var i = 0; i < postsArray.length; i++) likesMean += postsArray[i].node.edge_liked_by.count;
	for (var i = 0; i < postsArray.length; i++) commentsMean += postsArray[i].node.edge_media_to_comment.count;

	// likes mean calculated
	likesMean /= postsArray.length;
	commentsMean /= postsArray.length;

	for (var i = 0; i < postsArray.length; i++)
		likesScore += Math.abs(postsArray[i].node.edge_liked_by.count - likesMean) / likesMean;

	for (var i = 0; i < postsArray.length; i++)
		commentsScore += Math.abs(postsArray[i].node.edge_media_to_comment.count - commentsMean) / commentsMean;

	console.log('      inconsistentEngagementNumbers : ' + ((likesScore + commentsScore) / 2).toFixed(2));
	return (likesScore + commentsScore) / 2;
};

module.exports.hugeFollowingLowEngagement = (data) => {
	var postsArray = data.graphql.user.edge_owner_to_timeline_media.edges;
	var followersCount = data.graphql.user.edge_followed_by.count;
	var score = 0;

	for (var i = 0; i < postsArray.length; i++) {
		score +=
			postsArray[i].node.edge_liked_by.count / followersCount * 0.8 +
			postsArray[i].node.edge_media_to_comment.count / followersCount * 0.2;
	}

	score /= postsArray.length;
	score *= 100;

	console.log('      hugeFollowingLowEngagement : ' + score.toFixed(2));
	return score;
};

module.exports.lotsOffViewsNoLikes = (data) => {
	var postsArray = data.graphql.user.edge_owner_to_timeline_media.edges;
	var count = 0;
	var score = 0;

	for (var i = 0; i < postsArray.length; i++) {
		if (postsArray[i].node.is_video == true) {
			count++;
			score += postsArray[i].node.edge_liked_by.count / postsArray[i].node.video_view_count;
		}
	}

	if (count !== 0) score /= count;

	score = (1 - score) * 0.7 * 100;
	console.log('      lotsOffViewsNoLikes : ' + score.toFixed(2));
	return score;
};
