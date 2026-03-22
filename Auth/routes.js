import express from "express"
import { body, header, validationResult } from "express-validator"
import upload from "./middleware/multer.js"
import { ERROR_CODES, reportEmailExistsError, reportEmailNotFoundError, reportFileUploadError, reportInvalidAuthorizationTokenError, reportInvalidEmailError, reportInvalidUsernameError } from "../Shared/utils/errors.js"
import { cloudinaryUpload } from "./utils/cloudinary.js"
import Users from "../Database/Schema/UserSchema.js"
import bcrypt from "bcrypt"
import { generateAccessToken, generateRefreshToken } from "./utils/tokens.js"
import passport from "passport"
import { validateBearerJWT } from "./utils/validators.js"

// create a router for auth routes
const router = express.Router()

// number of rounds to use for bcrypt password hashing
const bcryptRounds = 10

// refresh token cookie options
const refreshTokenCookieOptions = {
    httpOnly: true,
    path: "/auth",
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

// POST /auth/signup - handle user signup, requires name, email,
// password, and optional profile photo as multipart/form-data
router.post("/signup", 
    upload.single("photo"),
    [
        body("email")
            .exists()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .isEmail()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .normalizeEmail(),
        body("password")
            .exists()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail()
            .isLength({ min: 6 })
            .withMessage( ERROR_CODES.INVALID_PASSWORD_FORMAT )
            .bail(),
        body("name")
            .exists()
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
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .isEmail()
            .withMessage( ERROR_CODES.INVALID_EMAIL )
            .bail()
            .normalizeEmail(),
        body("password")
            .exists()
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

export default router