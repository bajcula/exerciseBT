const express = require('express')
const router = express()
const moment = require('moment')

let user = {
    totalPoints:0,
    transactionsArr: [],
    dannonPoints: 0,
    unileverPoints: 0,
    millerCoorsPoints: 0
}

let payerMap = {
    "DANNON": "dannonPoints",
    "MILLER COORS": "millerCoorsPoints",
    "UNILEVER": "unileverPoints"
}

router.get('/check', async(req, res)=>{
    try{
        res.send({
            success: true,
            data: {
                "DANNON": user.dannonPoints,
                "UNILEVER": user.unileverPoints,
                "MILLER CORS": user.millerCoorsPoints
            }
        })
    }catch(err){
        res.send({
            success: false,
            data: err.message
        })
    }
})

router.post('/earn', async(req, res)=>{ 
    try{
        //checking if the transaction is possible
        if ((req.body.points >= 0) || (req.body.payer === "UNILEVER" && user.unileverPoints > -req.body.points) || (req.body.payer === "DANNON" && user.dannonPoints > -req.body.points) || (req.body.payer === "MILLER COORS" && user.millerCoorsPoints > -req.body.points)) {
            let n = user.transactionsArr.length
            let transactionDateTime = moment(req.body.timestamp)
            let formattedTransaction = {
                payer: req.body.payer,
                points: req.body.points,
                timestamp: transactionDateTime
            }
            // adding the transaction to our array
            if (n > 0) {
                i = 0
                while (i < n && user.transactionsArr[i].timestamp < transactionDateTime) {
                    i++
                }
                if (i === n) {
                    user.transactionsArr.push(formattedTransaction)
                } else {
                    user.transactionsArr.splice(i, 0, formattedTransaction)
                }
            } else {
                user.transactionsArr.push(formattedTransaction)
            }
            // updating points
            user.totalPoints += req.body.points
            user[payerMap[req.body.payer]] += req.body.points
            //sending back the data
            res.send({
                success: true,
                data: user
            })
        } else {
            res.send({
                success: false,
                data: `Not enough points for that transaction.`
            })
        }
    }catch(err){
        res.send({
            success: false,
            data: err.message
        })
    }
})

router.post('/spend', async(req, res)=>{
    const getRidOffZeroEntries = () => {
        let newTransactionsArr = user.transactionsArr.filter((tra)=> tra.points !== 0)
        user.transactionsArr = newTransactionsArr
    }
    try{
        if (req.body.points > user.totalPoints) {
            res.send({
                success: false,
                data: `Not enough total points for that transaction.`
            })
        } else if (req.body.points <= 0) {
            res.send({
                success: false,
                data: `Please send positive amount of points to spend.`
            })
        } else {
            let spentDanon = user.dannonPoints
            let spentUnilever = user.unileverPoints
            let spentMillerCoors = user.millerCoorsPoints
            // go through transactions array and handle (substract) negative points transactions before actually spending the points in order to see which points should we spend
            let currMinusIndex = 0
            while (currMinusIndex < user.transactionsArr.length) {
                if (user.transactionsArr[currMinusIndex].points < 0) {
                    let pointsToSubstract = -user.transactionsArr[currMinusIndex].points
                    while(pointsToSubstract > 0) {
                        for (let i = 0; i < user.transactionsArr.length; i++) {
                            if (user.transactionsArr[i].payer === user.transactionsArr[currMinusIndex].payer && currMinusIndex !== i && user.transactionsArr[i].points > 0) {
                                if (user.transactionsArr[i].points > pointsToSubstract) {
                                    user.transactionsArr[i].points -= pointsToSubstract
                                    pointsToSubstract = 0
                                    user.transactionsArr[currMinusIndex].points = 0
                                    break
                                } else {
                                    pointsToSubstract -= user.transactionsArr[i].points
                                    user.transactionsArr[i].points = 0
                                }
                            }
                        }
                    }
                    user.transactionsArr[currMinusIndex].points = 0
                }
                currMinusIndex += 1 
            }
            //remove 0 points entries in our array
            getRidOffZeroEntries()
            // then go through the array hronologically and spend points
            let totalPointsToSpend = req.body.points
            let currSpentPointsIdx = 0
            while (totalPointsToSpend > 0) {
                if (user.transactionsArr[currSpentPointsIdx].points > totalPointsToSpend) {
                    user.transactionsArr[currSpentPointsIdx].points -= totalPointsToSpend
                    user[payerMap[user.transactionsArr[currSpentPointsIdx].payer]] -= totalPointsToSpend
                    totalPointsToSpend = 0
                } else {
                    user[payerMap[user.transactionsArr[currSpentPointsIdx].payer]] -= user.transactionsArr[currSpentPointsIdx].points
                    totalPointsToSpend -= user.transactionsArr[currSpentPointsIdx].points
                    user.transactionsArr[currSpentPointsIdx].points = 0
                    currSpentPointsIdx++
                }
            }
            // remove 0 points entries in the array
            getRidOffZeroEntries()
            spentDanon -= user.dannonPoints
            spentMillerCoors -= user.millerCoorsPoints
            spentUnilever -= user.unileverPoints
            //send the data back
            res.send({
                success: true,
                data:  [
                    {"payer": "DANNON", "points": spentDanon > 0 ? -spentDanon : 0},
                    {"payer": "UNILEVER", "points": spentUnilever > 0 ? -spentUnilever : 0},
                    {"payer": "MILLER COORS", "points": spentMillerCoors > 0 ? -spentMillerCoors : 0},
                ]
            })
        }
    }catch(err){
        res.send({
            success: false,
            data: err.message
        })
    }
})

module.exports = router;
