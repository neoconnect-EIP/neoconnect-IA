const tiktok_scraper = require('tiktok-scraper')

class TikTokChecker{
    constructor(data){
        this.user = data.user
        this.videos = data.videos
    }
    getFinalScore(){
        let score = this.getFollowersScore() + this.getHeartScore() + this.getVerifiedScore() + this.getProfileScore() + this.getVideosScore()
        console.log(`Final score: ${score}`)
        return score;
	}
	// calculates followers score
    getFollowersScore(){
        const followers = this.user.fans;
        const following = this.user.following;
        const ratio = following / followers;
        let finalScore = 0
        if (following == 0 && followers == 0) finalScore = 0;
        else if (ratio < 0.5) finalScore = 100;
        else if (ratio < 1) finalScore = 80;
        else if (ratio < 2) finalScore = 60;
        else if (ratio < 10) finalScore = 40;
        else finalScore = 20;
        console.log('      getFollowersScore : ' + finalScore.toFixed(2));

        return finalScore;
	}
	// calculates heart(like) score
    getHeartScore() {
        const hearts = this.user.heart
        let finalScore = 0;
        if (hearts > 1000) finalScore = 100
        else if (hearts > 500) finalScore = 80
        else if (hearts > 100) finalScore = 50
        else finalScore = 20;
        console.log('      getHeartScore : ' + finalScore.toFixed(2));

        return finalScore;
	}
	// checks whether user is verified
    getVerifiedScore() {
        let finalScore = 0
        if (this.user.verified) finalScore = 500;
        else finalScore = 0
        console.log('      getVerifiedScore : ' + finalScore.toFixed(2));
        return finalScore
	}
	// calculates profile score
    getProfileScore() {
        let finalScore = 0
        if (this.user.signature) finalScore += 50
        if (this.user.openFavoruite) finalScore += 50
        console.log('      getProfileScore : ' + finalScore.toFixed(2));
        return finalScore
	}
	// calculates videos score
    getVideosScore(){
        let finalScore = 0
        const {avrgPlays, avrgShares, avrgComms} = this.videos
        if (this.videos.videos){
            if (avrgPlays > 100) finalScore += 33
            if (avrgShares > 5) finalScore += 33
            if (avrgComms > 10) finalScore += 33
        }
        console.log('      getVideosScore : ' + finalScore.toFixed(2));

        return finalScore
    }
}
// gets user followers
async function getTikTokFollowers(username){
	const user = await getTikTokUserData(username)
	if (user){
		if (!user.isSecret)
			return user.fans
		else 
			return false
	}else{
		return false
	}
}
// gets general result
async function getTikTokResult(username){
	const num  = await getTikTokNumerical(username)
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
			checks.error = 'TikTok API Error'
			checks.errorCode = 500
		break
	}
	return checks
}
// gets numerical result
async function getTikTokNumerical(username) {
    const data = await getTikTokFullData(username);
	if (data){
		try{
			if (data.user.isSecret){
				return 400
			}else{
				const tikChecker = new TikTokChecker(data)
				const score = tikChecker.getFinalScore()
				if (score > 200){
					return 0 // not bot
				}else {
					return 1
				}
			}
		}catch(e){
			return 400
		}
	}else{
		return 500
	}
}
// gets full profile data
async function getTikTokFullData(username){
	const user = await getTikTokUserData(username)
	const videos = await getTikTokUserVideos(username)
	if (user && videos) {
		return {
			user,
			videos
		}
	}else{
		return false
	}
}
// gets user data
async function getTikTokUserData(username) {
	try {
        const data = await tiktok_scraper.getUserProfileInfo(username)
		return data
	}catch(e) {
        console.log(e)
		return false
	}
}
// gets users video
async function getTikTokUserVideos(userId) {
	 try {
		 const data = await tiktok_scraper.user(userId, {
			 number: 50
		 })
		 if (data.collector.length){
			 const videos = data.collector;
			let avrgPlays = 0,
				avrgShares = 0,
				avrgComms = 0;
			 videos.forEach(val => {
				avrgPlays+=val.playCount
				avrgShares+=val.shareCount
				avrgComms+=val.commentCount
			 })
			 avrgPlays = parseInt(avrgPlays / videos.length)
			 avrgShares = parseInt(avrgShares / videos.length)
			 avrgComms = parseInt(avrgComms / videos.length)
			 return {videos: true, avrgPlays, avrgShares, avrgComms}
		 }else {
			 return {videos: false}
		 }
	 }catch(e) {
		 return false
	 }
}
module.exports = {getTikTokFollowers, getTikTokResult}