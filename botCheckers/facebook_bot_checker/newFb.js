const request = require('util').promisify(require('request').defaults({
    headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "ru-RU,ru;q=0.9,en-GB;q=0.8,en;q=0.7,en-US;q=0.6",
        "cache-control": "max-age=0",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "upgrade-insecure-requests": "1",
        'user-agent': 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+'
    }
}))
const cheerio = require('cheerio')
async function exist(id){
    let checks = {
		isBot: true,
		error: null,
		errorCode: 200
	}
    const page = await request(`https://www.facebook.com/${id}`)
    if (page.statusCode == 200){
        try{
            const $ = cheerio.load(page.body)
            if ($('meta[name="description"]').attr('content')){
                checks.isBot = false
            }
        }catch(e){}
    }
    return checks
}
module.exports = exist