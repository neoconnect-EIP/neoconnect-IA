const puppeteer = require('puppeteer');
const config = require('config');

async function checkFacebookProfileExistence(username) {
	let result = {
		exists: null,
		error: null,
		errorMsg: ''
	};

	let isHeadless = false;
	if (config.get('facebook.isVisualVerification') === true) isHeadless = false;
	else isHeadless = true;
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
				result.exists = true;
				resolve(result);
			} else {
				console.log('      The profile associated with the given username does not exist');
				result.exists = false;
				resolve(result);
			}
		});
	} catch (err) {
		console.log('At facebook scraper :');
		console.log(err);
	}
}

module.exports = { checkFacebookProfileExistence };
