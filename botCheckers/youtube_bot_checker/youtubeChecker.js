var request = require('request');
const config = require('config');

var periodRisk = 0;
var vidDescriptionRisk = 0;
var subViewRisk = 0;

function getChannelData(channelId) {
	return new Promise((resolve) => {
		request(
			`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics
&id=${channelId}&key=${config.get('youtube.apiKey')}`,
			function(error, response, body) {
				if (response.statusCode == 200) {
					channelData = JSON.parse(body);
					youtubeSubscriberRatiosCheck(channelData).then((result) => {
						resolve(result);
					});
				} else if (response.statusCode >= 400 && response.statusCode <= 499) {
					console.log('error:', error);
					400;
				} else {
					console.log('error:', error);
					return 500;
				}
			}
		);
	});
}

function getChannelActivities(channelId) {
	return new Promise((resolve) => {
		request(
			`https://www.googleapis.com/youtube/v3/activities?part=snippet,
			contentDetails&channelId=${channelId}&key=${config.get('youtube.apiKey')}`,
			function(error, response, body) {
				if (response.statusCode == 200) {
					let promises = [];
					activities = JSON.parse(body);
					promises.push(youtubePeriodCheck(activities));
					promises.push(youtubeVideosDescriptionCheck(activities));
					Promise.all(promises).then((results) => resolve(results));
				} else if (response.statusCode >= 400 && response.statusCode <= 499) {
					console.log('error:', error);
					return 400;
				} else {
					console.log('error:', error);
					return 500;
				}
			}
		);
	});
}

function youtubeBotCheck(channelId, checks) {
	console.log('');
	console.log('');
	console.log('Youtube :');
	return new Promise((resolve) => {
		checks.youtube = {
			isBot: null,
			errors: []
		};
		let promises = [];
		promises.push(getChannelActivities(channelId));
		promises.push(getChannelData(channelId));
		Promise.all(promises).then((results) => {
			if (results[0][0] >= 400) checks.youtube.errors.push({ code: results[0][0] });
			else if (results[0][1] >= 400) checks.youtube.errors.push({ code: results[0][1] });
			else if (results[1]) checks.youtube.errors.push({ code: results[1] });
			else {
				let finalRisk = (results[0][0] + results[0][1] + results[1]) / 3;
				console.log('      final : ' + finalRisk);
				if (finalRisk > 40) {
					checks.youtube.isBot = true;
					resolve(checks);
				} else {
					checks.youtube.isBot = false;
					resolve(checks);
				}
			}
		});
	});
}

function calculatePeriodsMedian(uploadDates, uploadsInfo) {
	let i;
	for (i = 0; i < uploadDates.length - 1; i++) {
		let mostRecent = uploadDates[i];
		let older = uploadDates[i + 1];

		let diff = mostRecent - older;

		//	Converting milliseconds results to seconds
		diff /= 1000;

		//	if two dates have the same day (for example they are both on the 13-08-2019)
		//	the result will be returned in minutes instead of seconds
		if (mostRecent.getDate() === older.getDate()) {
			uploadsInfo.sameDay.videosCount++;
			uploadsInfo.sameDay.periodMedian += diff;
		} else {
			uploadsInfo.differentDate.videosCount++;
			uploadsInfo.differentDate.periodMedian += diff;
		}
	}

	uploadsInfo.differentDate.periodMedian /= uploadsInfo.differentDate.videosCount;
	uploadsInfo.sameDay.periodMedian /= uploadsInfo.sameDay.videosCount;
}

function calculatePeriodsRisk(uploadDates, uploadsInfo, risks) {
	for (i = 0; i < uploadDates.length - 1; i++) {
		let mostRecent = uploadDates[i];
		let older = uploadDates[i + 1];

		let diff = (mostRecent - older) / 1000;

		//console.log('diff : ' + diff);

		//	if two dates have the same day (for example they are both on the 13-08-2019)
		//	the result of the substraction will be returned in minutes instead of seconds
		if (mostRecent.getDate() === older.getDate()) {
			risks.sameDay += Math.abs(diff - uploadsInfo.sameDay.periodMedian);
		} else {
			risks.differentDays += Math.abs(diff - uploadsInfo.differentDate.periodMedian);
		}
	}

	//	Multiplying by 3600 to get periods median in hours
	if (uploadsInfo.differentDate.videosCount !== 0)
		risks.differentDays /= uploadsInfo.differentDate.videosCount * 3600;
	if (uploadsInfo.sameDay.videosCount !== 0) risks.sameDay /= uploadsInfo.sameDay.videosCount * 3600;
}

/*
		function : youtubePeriodCheck
		Implementation :
			
*/
function youtubePeriodCheck(data) {
	return new Promise((resolve) => {
		let uploadDates = [];
		let activities = data.items;

		//	Extracting videos upload dates only
		activities.forEach((activity) => {
			let date = new Date(activity.snippet.publishedAt);
			uploadDates.push(date);
		});

		let uploadsInfo = {
			sameDay: {
				periodMedian: 0,
				videosCount: 0
			},
			differentDate: {
				periodMedian: 0,
				videosCount: 0
			}
		};

		calculatePeriodsMedian(uploadDates, uploadsInfo);

		//	Calculating risks
		let risks = {
			sameDay: 0,
			differentDays: 0
		};
		calculatePeriodsRisk(uploadDates, uploadsInfo, risks);

		if (risks.differentDays > 100) risks.differentDays = 100;
		if (risks.sameDay > 100) risks.sameDay = 100;

		if (risks.differentDays !== 0 && risks.sameDay !== 0) periodRisk = (risks.differentDays + risks.sameDay) / 2;
		else if (risks.differentDays !== 0) periodRisk = risks.differentDays;
		else periodRisk = risks.sameDay;

		console.log("      Period's risk : " + periodRisk);
		if (periodRisk < 1) resolve(100);
		resolve(0);
	});
}

function youtubeVideosDescriptionCheck(data) {
	return new Promise((resolve) => {
		let videosDescriptions = [];
		let activities = data.items;

		activities.forEach((activity) => {
			videosDescriptions.push(activity.snippet.description);
		});

		let redundantDescriptionsCount = 0;

		let i;
		for (i = 0; i < videosDescriptions.length - 1; i++) {
			if (videosDescriptions[i] === videosDescriptions[i + 1]) redundantDescriptionsCount++;
		}

		vidDescriptionRisk = redundantDescriptionsCount / videosDescriptions.length;
		vidDescriptionRisk *= 100;

		console.log('      Video description risk : ' + vidDescriptionRisk);
		resolve(vidDescriptionRisk);
	});
}

/*
		function : youtubeSubscriberRatiosCheck
		Implementation :
			Average ratio of subscribers:viewers is 14%
			We compare our ratio to the average ratio to  measure engagement
			A very low ratio means that this youtube channels is buying bots subscriptions
			or doing subscribe exchange with other channels
*/
function youtubeSubscriberRatiosCheck(data) {
	return new Promise((resolve) => {
		let viewCount = data.items[0].statistics.viewCount;
		let subscriberCount = data.items[0].statistics.subscriberCount;

		subViewRisk = viewCount / subscriberCount;

		if (subViewRisk > 14) subViewRisk = 0;

		console.log('Sub/View risk : ' + subViewRisk);
		resolve(subViewRisk);
	});
}

function getVideoCommentsUsingPageToken(videoId, pageToken) {
	return new Promise((resolve) => {
		request(
			`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${config.get(
				'youtube.apiKey'
			)}&pageToken=${pageToken}`,
			function(error, response, body) {
				if (response.statusCode == 200) {
					resolve(JSON.parse(body));
					return JSON.parse(body);
				} else if (response.statusCode >= 400 && response.statusCode <= 499) {
					console.log('error:', error);
					resolve();
					return 400;
				} else {
					console.log('error:', error);
					resolve();
					return 500;
				}
			}
		);
	});
}

async function getVideoComments(videoId) {
	return new Promise((resolve) => {
		request(
			`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${config.get(
				'youtube.apiKey'
			)}`,
			function(error, response, body) {
				if (response.statusCode == 200) {
					let data = JSON.parse(body);

					let extractedComments = [];
					let commentsArray = data.items;
					try {
						commentsArray.forEach((item) => {
							extractedComments.push(item.snippet.topLevelComment.snippet.textOriginal);
						});

						while (data.nextPageToken != null) {
							data = getVideoCommentsUsingPageToken(videoId, data.nextPageToken).then((data) => {
								if (typeof data === 'object') {
									commentsArray = data.items;
									try {
										commentsArray.forEach((item) => {
											extractedComments.push(item.snippet.topLevelComment.snippet.textOriginal);
										});
										resolve(extractedComments);
										return extractedComments;
									} catch (err) {
										console.log(err);
									}
								} else {
									console.log('There was an error while fetching the next page of comments');
								}
							});
						}
					} catch (err) {
						console.log(err);
					}
				} else if (response.statusCode >= 400 && response.statusCode <= 499) {
					console.log('error:', error);
					resolve(400);
					return 400;
				} else {
					console.log('error:', error);
					resolve(500);
					return 500;
				}
			}
		);
	});
}

function youtubeCommentsCheck(data) {
	let activities = data.items;
	let videosId = [];
	activities.forEach((activity) => {
		videosId.push(activity.contentDetails.upload.videoId);
	});

	//	Free memory
	activities = null;

	let videosComments = [];

	new Promise((resolve) => {
		videosId.forEach((videoId, index) => {
			getVideoComments(videoId).then((extractedComments) => {
				if (typeof extractedComments === 'object') {
					videosComments.push(extractedComments);
					console.log(videosComments);
					console.log(videosComments[0].length);
				} else console.log("there was an error while fetching video's comments");
			});

			if (index === videosId.length - 1) {
				console.log('yes' + index);
				resolve(videosComments);
			} else console.log('no ' + index);
		});
	}).then((videosComments) => {
		console.log(videosComments);
		let commentsCount = 0;
		let repetitiveCommentsCount = 0;

		//	Selects a video
		for (let i = 0; i < videosComments.length; i++) {
			//	Selects a comment from the previous selected video to compare with other comments
			for (let j = 0; j < videosComments[i].length; j++) {
				commentsCount++;
				//	Selects the next video to compare it comments with the previously selected comment
				for (let k = i + 1; k < videosComments.length; k++) {
					for (let m = 0; m < videosComments[k].length; m++) {
						if (videosComments[i][j] === videosComments[k][m]) repetitiveCommentsCount++;
					}
				}
			}
		}

		console.log('');
		console.log('');
		console.log('videosComments.length : ' + videosComments.length);
		console.log('videosComments[0].length : ' + videosComments[0]);
		console.log('repetitiveCommentsCount : ' + repetitiveCommentsCount);
		console.log('commentsCount : ' + commentsCount);
		console.log('comments risk : ' + repetitiveCommentsCount / commentsCount);
		return repetitiveCommentsCount / commentsCount;
	});
}

module.exports = youtubeBotCheck;
