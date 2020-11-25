//  Returns true if the two dates are belonging to the same day
function isSameDay(stringDate1, stringDate2) {
	var date1 = new Date(stringDate1);
	var date2 = new Date(stringDate2);

	if (
		date1.getDate() == date2.getDate() &&
		date1.getMonth() == date2.getMonth() &&
		date1.getFullYear() == date2.getFullYear()
	)
		return true;
	else return false;
}

//  Returns the count of tweets on a certain date
//  We pass the beginning index to optimize the function and avoid searching again for the date
function getCountOfTweetsOnADay(data, date, beginIndex) {
	var count = 1;

	//  Additional variable created to avoid confustion in the loop below (using beginIndex will confuse future maintainers)
	var i = beginIndex;

	//  Avoiding Array out of bounds exception and checking if we're still parsing the right date's tweets
	while (isSameDay(data[i].created_at, date) && i != data.length - 1) {
		i++;
		count++;
	}

	return count;
}

//  Returns the difference between two dates in minutes
function getDifferenceInMinutesBetweenTwoDates(stringDate1, stringDate2) {
	return Math.abs((new Date(stringDate1) - new Date(stringDate2)) / 60000);
}

//  Returns the mean of periods between each tweet is posted on a certain date
//  We pass the beginning index to optimize the function and avoid searching again for the date
function getMeanOfPostingPeriodsOnADay(data, date, beginIndex) {
	var period = 0;

	//  Additional variable created to avoid confustion in the loop below (using beginIndex will confuse future maintainers)
	var i = beginIndex;

	//  Avoiding Array out of bounds exception and checking if we're still parsing the right date's tweets
	//  And also checking if the the second date belongs to the same date we passed as an Argument
	while (isSameDay(data[i].created_at, date) && i != data.length - 1) {
		if (isSameDay(data[i].created_at, data[i + 1].created_at)) {
			period += getDifferenceInMinutesBetweenTwoDates(data[i].created_at, data[i + 1].created_at);
		}
		i++;
	}

	if (i == data.length - 1) return 0;
	return period / (i - beginIndex);
}

function calculateRiskScoreDependingOnPostingPeriods(data) {
	//  Check if the dataset exists

	if (data.length > 0) {
		var i = 0,
			risk = 0,
			daysCount = 0;

		while (i < data.length) {
			var tweetsCountOnCurrentDate = getCountOfTweetsOnADay(data, data[i].created_at, i);
			//  Flags a day if the tweets count bypass a certain limit
			if (tweetsCountOnCurrentDate > 0) {
				if (postingPeriodMean !== 0) daysCount++;
				var postingPeriodMean = getMeanOfPostingPeriodsOnADay(data, data[i].created_at, i);
				if (postingPeriodMean === 0) risk += 0;
				else if (postingPeriodMean < 10) risk += 100;
				else if (postingPeriodMean < 20) risk += 80;
				else if (postingPeriodMean < 30) risk += 60;
				else if (postingPeriodMean < 40) risk += 40;
				else if (postingPeriodMean < 50) risk += 20;
			}

			i++;
		}

		if (daysCount != 0) return risk / daysCount;
		return 0;
	}
}

module.exports = calculateRiskScoreDependingOnPostingPeriods;
