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
    getVerifiedScore() {
        let finalScore = 0
        if (this.user.verified) finalScore = 500;
        else finalScore = 0
        console.log('      getVerifiedScore : ' + finalScore.toFixed(2));
        return finalScore
    }
    getProfileScore() {
        let finalScore = 0
        if (this.user.signature) finalScore += 50
        if (this.user.openFavoruite) finalScore += 50
        console.log('      getProfileScore : ' + finalScore.toFixed(2));
        return finalScore
    }
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
module.exports = TikTokChecker