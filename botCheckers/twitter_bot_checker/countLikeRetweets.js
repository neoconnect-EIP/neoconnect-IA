function countTweetsLikesAndRetweets(data) {
	if (data.length > 0) {
		var likes = 0;
		var retweets = 0;

		for (var i = 0; i < data.length; i++) {
			if (i == 10) break;

			likes += data[i].favorite_count;
			//  Removing this condition will result in counting the tweets that are retweeted
			//  by the current user (will result in getting back a huge amount of retweets)
			if (data[i].retweeted == false) retweets += data[i].retweet_count;
		}

		return {
			likes,
			retweets
		};
	}
	return 0;
}

module.exports = countTweetsLikesAndRetweets;
