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
        const userViews = data.data.view_count
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
        const description = data.data.description
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
        const videos = data.videos.data
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
        let views = videos.reduce((sum, val) => sum + parseInt(val.view_count), 0)
        // Gets average views
        return views / videos.length
    }
}
module.exports = TwitchChecker