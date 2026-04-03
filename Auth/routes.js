import express from "express"
import { body, header, cookie, validationResult } from "express-validator"
import upload from "./middleware/multer.js"
import { ERROR_CODES, reportEmailExistsError, reportFileUploadError, reportInvalidAuthorizationTokenError, reportInvalidEmailError, reportInvalidRefreshTokenError, reportInvalidUsernameError, reportProfileUpdateFailureError } from "../Shared/utils/errors.js"
import { cloudinaryUpload } from "./utils/cloudinary.js"
import Users from "../Database/Schema/UserSchema.js"
import bcrypt from "bcrypt"
import { generateAccessToken, generateRefreshToken, verifyJWT } from "./utils/tokens.js"
import passport from "passport"
import { validateBearerJWT } from "../Shared/utils/validators.js"
import cookieParser from "cookie-parser"

// create a router for auth routes
const router = express.Router()

// number of rounds to use for bcrypt password hashing
const bcryptRounds = 10

// refresh token cookie options
const refreshTokenCookieOptions = {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}


// intialize cookie parser middleware to parse cookies from incoming requests
router.use( cookieParser() )


// POST /auth/signup - handle user signup, requires name, email,
// password, and optional profile photo as multipart/form-data
router.post("/signup", 
    upload.single("photo"),
    [
        body("email")
            .exists()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .isEmail()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .normalizeEmail(),
        body("password")
            .exists()
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail()
            .isLength({ min: 6 })
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail(),
        body("name")
            .exists()
            .withMessage( ERROR_CODES.INVALID_USERNAME )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_USERNAME )
            .bail()
            .isLength({ min: 3 })
            .withMessage( ERROR_CODES.INVALID_USERNAME )
            .bail()
    ],
    async function( req, res, next ) {
        // extract validation errors from the request
        const errors = validationResult( req )

        // check if there are validation errors and report 
        // the first one if any
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_EMAIL:
                    return reportInvalidEmailError( next )
                case ERROR_CODES.INVALID_PASSWORD_FORMAT:
                    return reportInvalidPasswordFormatError( next )
                case ERROR_CODES.INVALID_USERNAME:
                    return reportInvalidUsernameError( next )
            }
        }

        // if validation passed, check if a user with the same email already exists
        const existingUser = await Users.findOne({ email: req.body.email })
        if ( existingUser ) {
            return reportEmailExistsError( next )
        }

        // if validation passed, ccheck if a file was uploaded,
        // upload the file to cloudinary, and attach the file URL 
        // and public ID to the request body
        if ( req.file ) {
            try {
                const uploadResult = await cloudinaryUpload( req.file.buffer )
                req.body.profile_photo = uploadResult.secure_url
                req.body.profile_photo_public_id = uploadResult.public_id
            } catch ( error ) {
                return reportFileUploadError( next )
            }
        }

        // hash the password before saving the user to the database
        req.body.password = await bcrypt.hash( req.body.password, bcryptRounds )

        // if everything is successful, create the user in the database
        const user = await Users.signUp( req.body )

        // create access and refresh tokens for the user
        const accessToken = generateAccessToken( user._id )
        const refreshToken = generateRefreshToken( user._id )

        // save the refresh token to the user's document in the database
        user.refresh_token = refreshToken
        await user.save()

        // set the refresh token as an HTTP-only cookie in the response
        res.cookie( "refresh_token", refreshToken, refreshTokenCookieOptions )

        // send success response to the client
        return res.status( 201 ).json({
            status: "success",
            data: {
                user: {
                    ...user.getProfileData(),
                    access_token: accessToken,
                    expires_in: 15 * 60     // access token expires in 15 mins
                }
            }
        })
    }
)

// POST /auth/login - handle user login, requires email and password
// as JSON or url-encoded in the request body
router.post("/login", 
    [
        body("email")
            .exists()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .isEmail()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .normalizeEmail(),
        body("password")
            .exists()
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail()
            .isLength({ min: 6 })
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail()
    ],

    // middleware to validate the request body and report validation errors if any
    // before proceeding to passport authentication
    async function( req, res, next ) {
        // extract validation errors from the request
        const errors = validationResult( req )

        // check if there are validation errors and report 
        // the first one if any
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_EMAIL:
                    return reportInvalidEmailError( next )
                case ERROR_CODES.INVALID_PASSWORD_FORMAT:
                    return reportInvalidPasswordFormatError( next )
            }   
        }

        // if validation passed, proceed with passport local authentication
        next()
    },

    // use passport local strategy to authenticate the user with the 
    // provided email and password
    passport.authenticate("local", { session: false }),

    // if authentication is successful, generate access and refresh tokens 
    // for the user, save the refresh token to the database, set the refresh 
    // token as an HTTP-only cookie, and send the user's profile data and 
    // access token in the response
    async function( req, res, next ) {
        // if authentication is successful, generate access and refresh tokens for the user
        const accessToken = generateAccessToken( req.user._id )
        const refreshToken = generateRefreshToken( req.user._id )

        // save the refresh token to the user's document in the database
        req.user.refresh_token = refreshToken
        await req.user.save()

        // set the refresh token as an HTTP-only cookie in the response
        res.cookie( "refresh_token", refreshToken, refreshTokenCookieOptions )

        // send success response to the client with the user's profile data and access token
        return res.status( 200 ).json({
            status: "success",
            data: {
                user: {
                    ...req.user.getProfileData(),
                    access_token: accessToken,
                    expires_in: 15 * 60     // access token expires in 15 mins
                }
            }
        })
    }
)


// POST /auth/logout - handle user logout by clearing the refresh token cookie
// and removing the refresh token from the database
router.post("/logout",
    [
        header("Authorization")
            .exists()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .custom( validateBearerJWT )
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
    ],
    async function( req, res, next ) {
        // extract validation errors from the request
        const errors = validationResult( req )

        // check if there are validation errors and report
        // the first one if any
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
            }
        }

        // if validation passed, proceed with passport JWT authentication
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function( req, res, next ) {
        res.clearCookie( "refresh_token", refreshTokenCookieOptions )

        // remove the refresh token from the user's document in the database
        req.user.refresh_token = null
        await req.user.save()

        return res.status( 200 ).json({
            status: "success",
            data: {
                message: "You have been logged out successfully."
            }
        })
    }
)


// GET /auth/me - get the authenticated user's profile data, requires a valid JWT 
// in the Authorization header
router.get("/me",
    [
        header("Authorization")
            .exists()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .custom( validateBearerJWT )
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
    ],
    async function( req, res, next ) {
        // extract validation errors from the request
        const errors = validationResult( req )

        // check if there are validation errors and report
        // the first one if any
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
            }
        }

        // if validation passed, proceed with passport JWT authentication
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function( req, res, next ) {
        // if authentication is successful, generate a new access token for the user and send the user's profile data and access token in the response
        const accessToken = generateAccessToken( req.user._id )

        return res.status( 200 ).json({
            status: "success",
            data: {
                user: {
                    ...req.user.getProfileData(),
                    access_token: accessToken,
                    expires_in: 15 * 60     // access token expires in 15 mins
                }
            }
        })
    }
)


// GET /auth/refresh - refresh the user's access token using the refresh token stored 
// in the HTTP-only cookie
router.post("/refresh",
    [
        cookie("refresh_token")
            .exists()
            .withMessage( ERROR_CODES.INVALID_REFRESH_TOKEN )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_REFRESH_TOKEN )
            .bail()
            .isJWT()
            .withMessage( ERROR_CODES.INVALID_REFRESH_TOKEN )
            .bail()
    ],
    async function( req, res, next ) {
        // extract validation errors from the request
        const errors = validationResult( req )

        // check if there are validation errors and report
        // the first one if any
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_REFRESH_TOKEN:
                    return reportInvalidRefreshTokenError( next )
            }
        }

        // check if refresh token is not expired and is valid
        const refreshToken = req.cookies.refresh_token
        const decoded = verifyJWT( refreshToken )

        // if the refresh token is invalid or expired, report 
        // invalid refresh token error
        if ( !decoded ) {
            return reportInvalidRefreshTokenError( next )
        }

        // if the refresh token is valid, find the user in the database
        const user = await Users.findOne( { _id: decoded.userId, refresh_token: refreshToken } )

        // if user not found or refresh token does not match, report invalid refresh token error
        if ( !user ) {
            return reportInvalidRefreshTokenError( next )
        }

        // if the refresh token is valid and matches the one in the database, 
        // generate a new access and refresh token for the user and send them
        //  in the response
        const accessToken = generateAccessToken( user._id )
        const newRefreshToken = generateRefreshToken( user._id )

        // save the new refresh token to the user's document in the database
        user.refresh_token = newRefreshToken
        await user.save()

        // set the new refresh token as an HTTP-only cookie in the response
        res.cookie( "refresh_token", newRefreshToken, refreshTokenCookieOptions )

        return res.status( 200 ).json({
            status: "success",
            data: {
                user: {
                    ...user.getProfileData(),
                    access_token: accessToken,
                    expires_in: 15 * 60     // access token expires in 15 mins
                }
            }
        })
    }   
)


// GET /auth/google - handle Google OAuth login/signup, 
// requires a valid Google ID token in the request body
router.get("/google",
    // use passport Google strategy to authenticate the user 
    // by redirecting them to the Google OAuth consent screen
    passport.authenticate("google", { scope: [ "profile", "email" ] })
)


// GET /auth/google/callback - handle the callback from Google OAuth 
// after the user has authenticated, generate access and refresh tokens 
// for the user, save the refresh token to the database, set the refresh 
// token as an HTTP-only cookie, and send the user's profile data and access 
// token in the response
router.get("/google/callback",
    passport.authenticate( "google", { session: false }),
    async function( req, res, next ) {
        // if authentication is successful, generate access and refresh tokens for the user
        const accessToken = generateAccessToken( req.user._id )
        const refreshToken = generateRefreshToken( req.user._id )

        // save the refresh token to the user's document in the database
        req.user.refresh_token = refreshToken
        await req.user.save()

        // set the refresh token as an HTTP-only cookie in the response
        res.cookie( "refresh_token", refreshToken, refreshTokenCookieOptions )

        // send success response to the client with the user's profile data and access token
        return res.status( 200 ).json({
            status: "success",
            data: {
                user: {
                    ...req.user.getProfileData(),
                    access_token: accessToken,
                    expires_in: 15 * 60     // access token expires in 15 mins
                }
            }
        })
    }
)


// POST /auth/update -  handle user profile updates, requires a valid JWT in 
// the Authorization header and optional name and profile photo as 
// multipart/form-data in the request body
router.post("/update",
    upload.single("photo"),
    [
        header("Authorization")
            .exists()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .custom( validateBearerJWT )
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail(),
        body("name")
            .optional()
            .isLength({ min: 3 })
            .withMessage( ERROR_CODES.INVALID_USERNAME )
            .bail(),
        body("email")
            .optional()
            .isEmail()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .normalizeEmail()
            .bail(),
        body("password")
            .optional()
            .isLength({ min: 6 })
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail()
    ],
    async function( req, res, next ) {
        // extract validation errors from the request
        const errors = validationResult( req )

        // check if there are validation errors and report
        // the first one if any
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_USERNAME:
                    return reportInvalidUsernameError( next )
                case ERROR_CODES.INVALID_EMAIL:
                    return reportInvalidEmailError( next )
                case ERROR_CODES.INVALID_PASSWORD_FORMAT:
                    return reportInvalidPasswordFormatError( next )
            }
        }

        // if validation passed, proceed with passport JWT authentication
        return next()
    },

    // if validation passed, proceed with passport JWT authentication
    passport.authenticate("jwt", { session: false }),

    async function( req, res, next ) {
        // if a file was uploaded, upload the file to cloudinary and update the user's profile photo URL and public ID in the database
        if ( req.file ) {
            try {
                const uploadResult = await cloudinaryUpload( req.file.buffer )
                req.user.profile_photo = uploadResult.secure_url
                req.user.profile_photo_public_id = uploadResult.public_id
            } catch ( error ) {
                return reportFileUploadError( next )
            }
        }

        // perform google vs local validation checks - e.g. if the user 
        // authenticated with Google, they should not be able to update their 
        // email or password since those fields are managed by Google and 
        // not stored in the database
        if ( req.user.provider === "google" && 
            ( req.body.email || req.body.password ) ) 
        {
            return reportProfileUpdateFailureError( next )
        }

        // if a name was provided in the request body, 
        // update the user's name in the database
        if ( req.body.name ) {
            req.user.name = req.body.name
        }

        // if an email was provided in the request body, update 
        // the user's email in the database
        if ( req.body.email && req.user.provider !== "google" ) {
            req.user.email = req.body.email
        }

        // if a password was provided in the request body, hash the 
        // new password and update it in the database
        if ( req.body.password && req.user.provider !== "google" ) {
            req.user.password = await bcrypt.hash( req.body.password, bcryptRounds )
        }

        // create a new access token for the user after updating their profile
        const accessToken = generateAccessToken( req.user._id )

        // save the updated user document in the database
        await req.user.save()

        // send success response to the client with the updated user's 
        // profile data
        return res.status( 200 ).json({
            status: "success",
            data: {
                user: {
                    ...req.user.getProfileData(),
                    access_token: accessToken,
                    expires_in: 15 * 60     // access token expires in 15 mins
                }
            }
        })
    }
)



export default router