class PinterestChecker {
    constructor(data) {
        this.data = data.userData
        this.boards = data.boards
        this.pins = data.pins
    }
    getCompleteScore() {
        const completeScore = this.getProfileScore() + this.getFollowersScore() + (this.pins ? this.getPinsScore() : 0) + (this.boards ? this.getBoardsScore() : 0)
        console.log(`Final score: ${completeScore}`)
        return completeScore
    }
    getFollowersScore() {
        const data = this.data.data
        const userFollows = data.counts.following
        const userFollowers = data.counts.followers

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
    getProfileScore() {
        const data = this.data.data

        let finalScore = 0
        // Checks if first and last names are the same
        if (data.first_name != data.last_name) finalScore += 10
        // Checks if bio is more than 10 chars
        if (data.bio.length > 10) finalScore += 40
        const createdAt = new Date(data.created_at)
        const currentTime = new Date()
        // Checks if account is at least 1 year old
        if (currentTime.getFullYear() - createdAt.getFullYear() > 1) finalScore += 50
        console.log('      getProfileScore : ' + finalScore.toFixed(2));

        return finalScore
    }
    getBoardsScore() {
        const boards = this.boards.data
        const boardsCount = boards.length
        const points = 100 / boardsCount
        let finalScore = 0
        boards.forEach(val => {
            /*
                checking for:
                1. date of creation
                2. amount of pins
                3. description
                4. followers
            */
            if (val.privacy != 'public') return finalScore += points / 2
            const currentTime = new Date()
            const creationDate = new Date(val.created_at)
            const day = 1000 * 60 * 60 * 24
            const tenDays = day * 10
            if (creationDate.getTime() - currentTime.getTime() > tenDays) finalScore += points / 4
            if (val.counts.pins > 0) finalScore += points / 4
            if (val.description.length) finalScore += points / 4
            if (val.counts.followers > 0) finalScore += points / 4
        })
        finalScore = parseInt(finalScore)
        console.log('      getBoardsScore : ' + finalScore.toFixed(2));
        return finalScore
    }
    getPinsScore() {
        // For each pins gives 60% of score for saves, 30% for comments and 10% for existence
        const pins = this.pins.data
        const pinsCount = pins.length
        const points = 100 / pinsCount
        let finalScore = 0
        pins.forEach(val => {
            const count = val.counts
            if (count.saves > 0) finalScore += points * 0.6
            if (count.comments > 0) finalScore += points * 0.3
            finalScore += points * 0.1
        })
        finalScore = parseInt(finalScore)
        console.log('      getPinsScore : ' + finalScore.toFixed(2));
        return finalScore
    }
}
module.exports = PinterestChecker