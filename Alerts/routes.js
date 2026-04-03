// import necessary modules and utilities
import express from "express"
import { body, header, param, validationResult } from "express-validator"
import passport from "passport"
import { ERROR_CODES, reportAlertNotFoundError, reportAlertOperationFailureError, reportInvalidAlertConditionError, reportInvalidAlertIdError, reportInvalidAlertMessageError, reportInvalidAlertTargetPriceError, reportInvalidAlertTitleError, reportInvalidAssetSymbolError, reportInvalidAuthorizationTokenError } from "../Shared/utils/errors.js"
import { validateBearerJWT } from "../Shared/utils/validators.js"
import Alert from "../Database/Schema/AlertSchema.js"

// Initialize router
const router = express.Router()


// POST /app/alerts - Create a new price alert for a specific asset. 
// Requires authentication via Bearer JWT token in the Authorization header.
router.post("/",
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
        body("symbol")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
            .bail(),
        body("condition")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ALERT_CONDITION )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_CONDITION )
            .bail()
            .isIn(["above", "below"])
            .withMessage( ERROR_CODES.INVALID_ALERT_CONDITION )
            .bail(),
        body("target_price")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ALERT_TARGET_PRICE )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_TARGET_PRICE )
            .bail()
            .isFloat({ gt: 0 })
            .withMessage( ERROR_CODES.INVALID_ALERT_TARGET_PRICE )
            .bail(),
        body("title")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ALERT_TITLE )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_TITLE )
            .bail()
            .isLength({ max: 100 })
            .withMessage( ERROR_CODES.INVALID_ALERT_TITLE )
            .bail(),
        body("message")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ALERT_MESSAGE )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_MESSAGE )
            .bail()
            .isLength({ max: 500 })
            .withMessage( ERROR_CODES.INVALID_ALERT_MESSAGE )
            .bail()
    ],
    function( req, res, next ) {
        // get validation errors from the request
        const errors = validationResult( req )

        // check if there are any validation errors and report them
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_ASSET_SYMBOL:
                    return reportInvalidAssetSymbolError( next )
                case ERROR_CODES.INVALID_ALERT_CONDITION:
                    return reportInvalidAlertConditionError( next )
                case ERROR_CODES.INVALID_ALERT_TARGET_PRICE:
                    return reportInvalidAlertTargetPriceError( next )
                case ERROR_CODES.INVALID_ALERT_TITLE:
                    return reportInvalidAlertTitleError( next )
                case ERROR_CODES.INVALID_ALERT_MESSAGE:
                    return reportInvalidAlertMessageError( next )
            }
        }

        // proceed to the other route handlers if there are no validation errors
        next()
    },
    passport.authenticate("jwt", { session: false } ),
    async function( req, res, next ) {
        // get the authenticated user and alert details from the request
        const user = req.user
        const { symbol, condition, target_price, title, message } = req.body

        try {
            // create the alert using the createAlert static method on the Alert model
            const alert = await Alert.createAlert({
                user_id: user._id,
                asset_symbol: symbol,
                condition,
                target_price,
                title,
                message
            })

            // return a success response with the created alert data
            return res.status(201).json({
                status: "success",
                data: {
                    id: alert._id,
                    asset_symbol: alert.asset_symbol,
                    condition: alert.condition,
                    target_price: alert.target_price,
                    title: alert.title,
                    message: alert.message,
                }
            })
        } catch( error ) {
            return reportAlertOperationFailureError( next, error.message )
        }
    }
)


// DELETE /app/alerts/:id - Delete an existing price alert by its ID. 
// Requires authentication via Bearer JWT token in the Authorization header.
router.delete("/:id",
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
        param("id")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ALERT_ID )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_ID )
            .bail()
            .isMongoId()
            .withMessage( ERROR_CODES.INVALID_ALERT_ID )
            .bail()
    ],
    function( req, res, next ) {
        // get validation errors from the request
        const errors = validationResult( req )

        // check if there are any validation errors and report them
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_ALERT_ID:
                    return reportInvalidAlertIdError( next )
            }
        }

        // proceed to the other route handlers if there are no validation errors
        next()
    },
    passport.authenticate("jwt", { session: false } ),
    async function( req, res, next ) {
        // get the authenticated user and alert ID from the request
        const user = req.user
        const { id } = req.params

        try {
            // find the alert by ID and user ID to ensure the user can only delete their own alerts
            const alert = await Alert.removeAlert( id, user._id )

            // return a success response if the alert was found and deleted
            if ( alert ) {
                return res.status(204).send()
            }

            // return a not found error if the alert was not found
            return reportAlertNotFoundError( next )
        } catch( error ) {
            return reportAlertOperationFailureError( next, error.message )
        }
    }

)


// export router for use in server.js
export default router