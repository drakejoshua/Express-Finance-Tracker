import express from "express"
import { body, validationResult } from "express-validator"
import upload from "./middleware/multer.js"
import { ERROR_CODES, reportEmailExistsError, reportFileUploadError, reportInvalidEmailError, reportInvalidUsernameError } from "../Shared/utils/errors.js"
import { cloudinaryUpload } from "./utils/cloudinary.js"
import Users from "../Database/Schema/UserSchema.js"
import bcrypt from "bcrypt"
import { generateAccessToken, generateRefreshToken } from "./utils/tokens.js"

// create a router for auth routes
const router = express.Router()

// number of rounds to use for bcrypt password hashing
const bcryptRounds = 10

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
        res.cookie( "refresh_token", refreshToken, {
            httpOnly: true,
            path: "/auth",
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

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

export default router