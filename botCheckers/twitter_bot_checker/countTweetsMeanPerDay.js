function getCountOfTweetsPerDayMean(data) {
	// Checks if there are tweets on the account
	if (data.length > 0) {
		if (data.length == 3200) console.log('must parse other pages');

		let currentDate = new Date(data[0].created_at);
		var daysCount = 1;

		for (let i = 0; i < data.length; i++) {
			let dateToCheck = new Date(data[i].created_at);

			let day = dateToCheck.getDate();
			let month = dateToCheck.getMonth();
			let year = dateToCheck.getFullYear();

			//  Counts the number of days when the user was active
			if (day != currentDate.getDate() || month != currentDate.getMonth() || year != currentDate.getFullYear()) {
				currentDate = dateToCheck;
				daysCount++;
			}
		}
	}

	var mean = data.length / daysCount;

	if (mean > 100) return 100;
	else if (mean > 80) return 80;
	else if (mean > 60) return 60;
	else if (mean > 40) return 40;
	else if (mean > 20) return 20;
	return 0;
}

module.exports = getCountOfTweetsPerDayMean;
