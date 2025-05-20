const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const connectDb = require('./Db/connection')
const dotenv = require('dotenv')
dotenv.config()
const userRoutes = require('./routes/userRoutes')
const bookRoutes = require('./routes/bookRoutes')
const limiter = require('./middleware/ratelimiting')

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json())
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(limiter)

app.use('/user', userRoutes)
app.use('/book', bookRoutes)


const PORT = process.env.PORT || 3000
app.listen(PORT, ()=>{
    console.log(`server running on http://localhost:${PORT}`);
    connectDb()
    
})