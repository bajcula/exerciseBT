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
    // let ourUser = user
    try{
        //checking if the transactions is possible
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
            console.log(req.body.points)
            // updating points
            user.totalPoints += req.body.points
            if (req.body.payer === "UNILEVER") {
                user.unileverPoints += req.body.points
            } else if (req.body.payer === "MILLER COORS") {
                user.millerCoorsPoints += req.body.points
            } else if (req.body.payer === "DANNON") {
                user.dannonPoints += req.body.points
            }
            
            // user = user
            
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

    let payerMap = {
        "DANNON": "dannonPoints",
        "MILLER COORS": "millerCoorsPoints",
        "UNILEVER": "unileverPoints"
    }

    // let user = user

    try{
        if (req.body.points > user.totalPoints) {
            console.log("hi")
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
            console.log("ENTER")
            console.log(user)
            let spentDanon = user.dannonPoints
            let spentUnilever = user.unileverPoints
            let spentMillerCoors = user.millerCoorsPoints
            // go through transactions array and handle (substract) negative points transactions before actually spending the points in order to see which points should we spend
            let currMinusIndex = 0
            while (currMinusIndex < user.transactionsArr.length) {
                console.log(1)
                if (user.transactionsArr[currMinusIndex].points < 0) {
                    console.log(2)
                    let pointsToSubstract = -user.transactionsArr[currMinusIndex].points
                    console.log(3)
                    while(pointsToSubstract > 0) {
                        console.log(4)
                        for (let i = 0; i < user.transactionsArr.length; i++) {
                            console.log(5)
                            if (user.transactionsArr[i].payer === user.transactionsArr[currMinusIndex].payer && currMinusIndex !== i && user.transactionsArr[i].points > 0) {
                                if (user.transactionsArr[i].points > pointsToSubstract) {
                                    console.log("1", user.dannonPoints)
                                    user.transactionsArr[i].points -= pointsToSubstract
                                    // user[payerMap[user.transactionsArr[i].payer]] -= pointsToSubstract
                                    pointsToSubstract = 0
                                    user.transactionsArr[currMinusIndex].points = 0
                                    console.log("2", user.dannonPoints)
                                    break
                                } else {
                                    // tricky part
                                    console.log("3", user.dannonPoints)
                                    pointsToSubstract -= user.transactionsArr[i].points
                                    user[payerMap[user.transactionsArr[i].payer]] -= user.transactionsArr[i].points
                                    user.transactionsArr[i].points = 0
                                    console.log("4", user.dannonPoints)
                                }
                            }
                        }
                    }
                    user.transactionsArr[currMinusIndex].points = 0
                }
                currMinusIndex += 1 
            }

            //remove null entries (points spent to offset negative transactions)
            
            getRidOffZeroEntries()
            // then go through the array hronologically and spend points...
            let totalPointsToSpend = req.body.points
            let currSpentPointsIdx = 0
            console.log("1", user.transactionsArr)
           
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
            
            console.log("2", user.transactionsArr)
            getRidOffZeroEntries()
            console.log("3", user.transactionsArr)

            spentDanon -= user.dannonPoints
            spentMillerCoors -= user.millerCoorsPoints
            spentUnilever -= user.unileverPoints

            console.log(spentDanon, spentMillerCoors, spentUnilever)
            console.log(user)
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
