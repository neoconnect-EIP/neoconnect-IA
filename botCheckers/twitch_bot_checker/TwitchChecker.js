const {
    promisify
} = require('util')
const config = require('config')
const requestAsyncTwitch = promisify(require('request').defaults({
    headers: {
		'Accept': 'application/vnd.twitchtv.v5+json',
        'Client-ID': config.get('twitch.client_id')
    },
    rejectUnauthorized: false
}))

class TwitchChecker {
    constructor(data) {
        this.data = data
    }
    getCompleteScore() {
        // Gets sum of all scores
        const completeScore = this.getFollowersScore() + this.getViewsScore() + this.getProfileScore() + (this.data.videos ? this.getVideosScore() : 0)
        console.log(`Final score: ${completeScore}`)
        return completeScore
    }
    getFollowersScore() {
        const data = this.data
        const userFollows = data.follows
        const userFollowers = data.followers

        const ratio = userFollows / userFollowers
        let finalScore = 0
        if (ratio < 0.5) finalScore = 100;
        else if (ratio < 1) finalScore = 80;
        else if (ratio < 2) finalScore = 60;
        else if (ratio < 10) finalScore = 40;
        else finalScore = 20;

        console.log('      getFollowersScore : ' + finalScore.toFixed(2));

        return finalScore;
    }
    getViewsScore() {
        const data = this.data
        const userViews = data.views
        let finalScore = 0
        // Checks how many views user has and gets the score
        if (userViews > 1000) finalScore = 100
        else if (userViews > 500) finalScore = 80
        else if (userViews > 300) finalScore = 60
        else if (userViews > 100) finalScore = 40
        else if (userViews > 0) finalScore = 20

        console.log('      getViewsScore : ' + finalScore.toFixed(2));

        return finalScore
    }
    getProfileScore() {
        const data = this.data
        const description = data.data.bio
        let finalScore = 0
        // If description exists add points
        if (description.length) finalScore += 33
        // If profile has an image add points
        if (data.data.profile_image_url) finalScore += 33
        // If profile is a partner of twitch add points
        if (data.data.broadcaster_type) finalScore += 33
        // If there is 'bot' in description lowers the score
        if (description.toLowerCase().indexOf('bot') > -1) {
            finalScore = -100000000000000
        }
        console.log('      getProfileScore : ' + finalScore)

        return finalScore
    }
    getVideosScore() {
        const data = this.data
        const videos = data.videos
        // Gets average views
        const avrgViews = parseInt(this.getAverageViews(videos))
        console.log('      Average Views : ' + parseInt(avrgViews))
        // Gets views/followers ratio
        const ratio = avrgViews / data.followers
        let finalScore = 0
        // Calculates final score
        if (ratio > 0.2) finalScore = 100
        else if (ratio > 0.1) finalScore = 80
        else if (ratio > 0.05) finalScore = 60
        else if (ratio > 0.01) finalScore = 40
        else finalScore = 20
        console.log('      getVideosScore : ' + finalScore)

        return finalScore
    }
    getAverageViews(videos) {
        // Gets sum of all views
        let views = videos.reduce((sum, val) => sum + parseInt(val.views), 0)
        // Gets average views
        return views / videos.length
    }
}
// gets general result
async function getTwitchResult(login){
	const num  = await getTwitchNumericResult(login)
	let checks = {
		isBot: null,
		error: null,
		errorCode: 200
	}
	switch(num){
		case 0:
			checks.isBot = false
		break
		case 1:
			checks.isBot = true
		break
		case 400:
			checks.error = 'API Error'
			checks.errorCode = 400
			
		break
		case 500:
			checks.error = 'Twitch API Error'
			checks.errorCode = 500
		break
	}
	return checks
}
// generates numerical result
async function getTwitchNumericResult(login) {
    let checks = {
        isBot: null,
        errors: []
    }
    // Retrieves twitch user data from API 
    const userData = await getTwitchUserData(login)
    // If there's an error in retrieving returns error with it's text
    if (userData.error) {
        console.log(`Error: ${userData}`)
        return 500
    }
    console.log('Successfully retrieved user data')
    // Create an instance of TwitchChecker class with provided data
    const twitchChecker = new TwitchChecker(userData)
    try {
        // Get  score
        const score = twitchChecker.getCompleteScore()
        if (score > 100) return 0
		else return 1
    } catch (e) {
        // If there is an error return it
        console.log(e)
		return 400
    }
    return 1
}
async function getTwitchUserData(login) {
    console.log(`Getting data for ${login}`)

    let userData = await requestAsyncTwitch(`https://api.twitch.tv/kraken/users?login=${login}`)
	// if first request is successfull then all other will be
	// console.log(userData.body)
    if (userData.statusCode === 200) {
        userData = JSON.parse(userData.body).users
        if (userData.length) {
            userData = userData[0]
			let userFollows = (await requestAsyncTwitch(`https://api.twitch.tv/kraken/users/${userData._id}/follows/channels`)).body
			let  userFollowers = (await requestAsyncTwitch(`https://api.twitch.tv/kraken/channels/${userData._id}`)).body
            let userVideos = (await requestAsyncTwitch(`https://api.twitch.tv/kraken/channels/${userData._id}/videos`)).body
            userFollowers = JSON.parse(userFollowers)
            userFollows = JSON.parse(userFollows)
            userVideos = JSON.parse(userVideos)

            // Check whether user has videos
			if (userVideos.status === 404 || !userVideos._total) userVideos = false
            return {
                error: false,
                data: userData,
                followers: userFollowers.followers,
                follows: userFollows._total,
                videos: userVideos.videos
            }
        } else return {
            error: true,
			errorCode: 500
        }
    } else return {
        error: true,
        errorCode: 500
    }
}
// gets users' followers
async function getTwitchFollowers(login){
	const user = await getTwitchUserData(login)
	if (!user.error)
		return user.followers;
	else 
		return false
}

module.exports = { getTwitchResult, getTwitchFollowers }