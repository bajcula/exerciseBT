const express = require('express')
const cors = require('cors')
const userController = require('./controllers/userController.js')
const app = express();
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/user', userController)

const start = (port) => {
    try {
        app.listen(port);
        console.log("running on ", port)
    } catch (err) {
        console.error(err);
        process.exit();
    }
};

start(port);