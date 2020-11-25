module.exports.getFollowingCountScore = (data) => {
	let followersCount = data.graphql.user.edge_followed_by.count;
	let followingCount = data.graphql.user.edge_follow.count;

	let finalScore = 0;
	let ratio = followersCount / followingCount;

	if (ratio < 0.5) finalScore = 100;
	else if (ratio < 1) finalScore = 80;
	else if (ratio < 2) finalScore = 60;
	else if (ratio < 10) finalScore = 40;
	else finalScore = 20;

	console.log('      getFollowingCountScore : ' + finalScore.toFixed(2));
	return finalScore;
};
