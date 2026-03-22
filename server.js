import express from 'express'
import { connectDB } from './Database/utils/connectDB.js'
import { checkDBConnection } from './Database/middleware/checkDBConnection.js'
import { NotFound } from './Shared/middleware/NotFound.js'
import { error } from './Shared/middleware/error.js'
import { logger } from './Shared/middleware/logger.js'
import authRoutes from './Auth/routes.js'
import passport from 'passport'
import { configurePassport } from './Auth/middleware/passport.js'

const server = express()

const PORT = process.env.PORT || 8000

// connect to database before starting server
await connectDB()

// initialize passport for authentication
server.use( passport.initialize() )

// configure passport strategies
configurePassport( passport )

// Logger middleware to log all incoming requests
server.use( logger )

// Middleware to check database connection on each request
server.use(checkDBConnection)

// add middleware to parse JSON request bodies
server.use(express.json())

// add middleware to parse URL-encoded request bodies
server.use(express.urlencoded({ extended: true }))


// add auth routes with /auth prefix
server.use("/auth", authRoutes )


// not found middleware to catch all unmatched routes and return 404
server.use( NotFound )

// global error handler to catch all errors and return 500
server.use( error )


server.listen( PORT, () => {
    console.log(`Server is running on port ${ PORT }` )
})