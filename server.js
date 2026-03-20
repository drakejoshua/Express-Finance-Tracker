import express from 'express'
import { connectDB } from './Database/utils/connectDB.js'
import { checkDBConnection } from './Database/middleware/checkDBConnection.js'
import { NotFound } from './Shared/middleware/NotFound.js'
import { error } from './Shared/middleware/error.js'
import { logger } from './Shared/middleware/logger.js'

const server = express()

let isDBConnected = false
const PORT = process.env.PORT || 8000

// Middleware to check database connection before handling requests
// server.use(async (req, res, next) => {
//     try {
//         // If already connected, move on
//         if (isDBConnected) {
//             return next()
//         }

//         // Attempt connection
//         await mongoose.connect("mongodb://localhost:27017/finance-app", {
//             serverSelectionTimeoutMS: 5000 // prevents hanging forever
//         })

//         isDBConnected = true
//         console.log("Connected to MongoDB")

//         next()
//     } catch (err) {
//         console.error("Failed to connect to MongoDB", err.message)

//         // send response
//         res.status(500).send("Failed to connect to database")

//         // optional: kill process (not recommended here)
//         process.exit(1)
//     }
// })

// connect to database before starting server
await connectDB()

// Logger middleware to log all incoming requests
server.use( logger )

// Middleware to check database connection on each request
server.use(checkDBConnection)


server.get("/", (req, res) => {
    res.send("Hello World")
})


// not found middleware to catch all unmatched routes and return 404
server.use( NotFound )

// global error handler to catch all errors and return 500
server.use( error )

server.listen( PORT, () => {
    console.log("Server is running")
})