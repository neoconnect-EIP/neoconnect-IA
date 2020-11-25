const puppeteer = require('puppeteer');
const config = require('config');

async function facebookChecker(username) {
	let result = {
		isBot: null,
		error: null,
		errorCode: ''
	};

	let isHeadless = false;
	if (config.get('facebook.isVisualVerification') === true) isHeadless = false;
	else isHeadless = false;
	try {
		const browser = await puppeteer.launch({ headless: isHeadless });
		const page = await browser.newPage();

		try {
			await page.goto('https://mobile.facebook.com/');
		} catch (err) {
			console.log(`Error : ${err}`);
		}
		console.log('');
		console.log('');
		console.log('Facebook : ');
		console.log('      browser is open');

		// Login
		await page.type('#m_login_email', config.get('facebook.email'));
		await page.type('#m_login_password', config.get('facebook.password'));
		await page.click('#u_0_4 button');

		await page.waitForNavigation();
		console.log('      logged in');

		// Get cookies
		const cookies = await page.cookies();

		// Use cookies in other tab or browser
		const page2 = await browser.newPage();
		await page2.setCookie(...cookies);
		const response = await page2.goto(`https://m.facebook.com/${username}`); // Opens page as logged user
		browser.close();
		return new Promise((resolve, reject) => {
			if (response.status() == 200) {
				console.log('      This profile exists');
				result.isBot = false;
				result.errorCode = 200
				resolve(result);
			} else {
				console.log('      The profile associated with the given username does not exist');
				result.isBot = true;
				result.errorCode = 200
				resolve(result);
			}
		});
	} catch (err) {
		console.log('At facebook scraper :');
		console.log(err);
	}
}
function getFacebookResult(facebookUsername, checks) {
	return new Promise((resolve) => {
		facebookChecker(facebookUsername).then((result) => {
			resolve(result);
		});
	});
}

function getFacebookNumericResult(facebookUsername) {
	let promise = new Promise((resolve) => {
		facebookChecker(facebookUsername).then((result) => {
			result = {
				exists: null,
				error: null,
				errorMsg: ''
			};
			resolve(result);
		});
	});

	promise.then((result) => {
		if (result.exists !== null) {
			if (result.exists === true) return 1;
			else if (result.exists === false) return 0;
		} else if (result.error.length > 0) {
			if (result.error === 500) return 500;
			else return 400;
		}
	});
}

module.exports = { getFacebookResult, getFacebookNumericResult };
