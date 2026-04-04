// import necessary modules and utilities
import express from "express"
import { body, header, param, query, validationResult } from "express-validator"
import passport from "passport"
import { ERROR_CODES, reportAlertNotFoundError, reportAlertOperationFailureError, reportInvalidAlertConditionError, reportInvalidAlertIdError, reportInvalidAlertMessageError, reportInvalidAlertTargetPriceError, reportInvalidAlertTitleError, reportInvalidAssetSymbolError, reportInvalidAuthorizationTokenError, reportInvalidPortfolioQueryError } from "../Shared/utils/errors.js"
import { validateBearerJWT } from "../Shared/utils/validators.js"
import Alert from "../Database/Schema/AlertSchema.js"
import { getBatchCoinsDetails } from "../Shared/utils/coingecko.js"
import { sliceAndJoinArrayIntoChunksUsingLimit, roundToTwoDecimalPlaces } from "../Shared/utils/helpers.js"

// Initialize router
const router = express.Router()


// GET /app/alerts?limit={ int } - get the authenticated user's watchlist with current price, 
// sparkline data, details for each asset and watchlist summary. Requires a valid JWT token 
// in the Authorization header.
router.get("/", 
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
        query("limit")
            .optional()
            .isInt({ gt: 0 })
            .withMessage( ERROR_CODES.INVALID_PORTFOLIO_QUERY )
            .bail()
    ],
    function( req, res, next ) {
        // extract validation errors from the request if any
        const errors = validationResult( req )

        // check if there are validation errors and return the first error message if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_PORTFOLIO_QUERY:
                    return reportInvalidPortfolioQueryError( next )
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
            }
        }

        // proceed with the request handling if there are no validation errors
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function( req, res, next ) {
        try {
            // get the authenticated user from the request object 
            // (populated by passport after successful authentication)
            const authenticatedUser = req.user

            // extract the optional limit query param from the request
            const limit = parseInt(req.query.limit) || 10

            // fetch all the active alerts that belong to the authenticated user from the database
            const alerts = await Alert.find({ user_id: authenticatedUser._id, is_active: true })
                                    .limit(limit)
            const totalAlerts = await Alert.countDocuments({ user_id: authenticatedUser._id, is_active: true })

            // extract the asset symbols from the fetched alerts to get the unique list of 
            // assets in the user's alerts for fetching their details from the coingecko API
            const alertAssetSymbols = new Set( alerts.map( alert => alert.asset_symbol ) )
            const uniqueAlertAssetSymbols = [ ...alertAssetSymbols ]


            // split the authenticated-user watchlist array into a compiled array which 
            // contains strings as a comma-seperated list of 49 symbols each. This is done 
            // to allow batch fetching of coin details from the coingecko API
            let results = sliceAndJoinArrayIntoChunksUsingLimit( uniqueAlertAssetSymbols, 49 )

            // fetch details of the resulting symbol lists from coingecko at once
            let batchCoinsDetailsResp = await Promise.all( results.map( function( symbols_ids ) {
                return getBatchCoinsDetails( symbols_ids )
            }))

            // combine all the batch-fetched coin details into a flat array instead of the 
            // normal response format gotten from the coingecko helper function
            let batchCoinsDetails = []

            batchCoinsDetailsResp.forEach( function( coinBatch ) {
                if ( coinBatch.status === "error" ) {
                    throw new Error( coinBatch.error.message )
                }

                batchCoinsDetails.push( ...coinBatch.data )
            })

            // populate the alert assets with the fetched coin details from coingecko 
            const symbolsMap =  new Map( batchCoinsDetails.map( coin => [ coin.id, coin ] ) )

            let populatedAlertData = alerts.map( function( alert ) {
                let coinDetail = symbolsMap.get( alert.asset_symbol )

                return {
                    id: coinDetail.id,
                    name: coinDetail.name,
                    image: coinDetail.image,
                    price: roundToTwoDecimalPlaces( coinDetail.current_price ),
                    percent_change_24h: roundToTwoDecimalPlaces( coinDetail.price_change_percentage_24h ),
                    price_change_24h: roundToTwoDecimalPlaces( coinDetail.price_change_24h ),
                    target_price: alert.target_price,
                    condition: alert.condition,
                    title: alert.title,
                    message: alert.message
                }
            })

            // since the fetched alert data has succesfully been extracted and 
            // transformed, send response containing all required information from endpoint
            res.json({
                status: "success",
                data: {
                    total_alerts: totalAlerts,
                    alerts: populatedAlertData.slice( 0, limit )
                }
            })


        } catch ( error ) {
            return reportAlertOperationFailureError( next, error.message )
        }
    }
)


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


// PUT /app/alerts/:id - Update an existing price alert by its ID. 
// Requires authentication via Bearer JWT token in the Authorization header.
// Request body can contain any of the alert fields to be updated such as: 
// condition, target_price, title, message, etc.
router.put("/:id",
    [
        param("id")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ALERT_ID )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_ID )
            .bail()
            .isMongoId()
            .withMessage( ERROR_CODES.INVALID_ALERT_ID )
            .bail(),
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
        body("condition")
            .optional()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_CONDITION )
            .bail()
            .isIn(["above", "below"])
            .withMessage( ERROR_CODES.INVALID_ALERT_CONDITION )
            .bail(),
        body("target_price")
            .optional()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_TARGET_PRICE )
            .bail()
            .isFloat({ gt: 0 })
            .withMessage( ERROR_CODES.INVALID_ALERT_TARGET_PRICE )
            .bail(),
        body("title")
            .optional()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_TITLE )
            .bail()
            .isLength({ max: 100 })
            .withMessage( ERROR_CODES.INVALID_ALERT_TITLE )
            .bail(),
        body("message")
            .optional()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ALERT_MESSAGE )
            .bail()
            .isLength({ max: 500 })
            .withMessage( ERROR_CODES.INVALID_ALERT_MESSAGE )
            .bail(),
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
        // get the authenticated user, alert ID and update data from the request
        const user = req.user
        const { id } = req.params
        const updateData = req.body

        try {
            // find the alert by ID and user ID to ensure the user can only 
            // update their own alerts
            const alert = await Alert.findOne({ _id: id, user_id: user._id })

            // if no alert is found from the search operation,
            // return an AlertNotFound Error
            if ( !alert ) {
                return reportAlertNotFoundError( next )
            }

            // update the alert with the new data
            await alert.updateAlert( updateData )

            // send the updated alert as the response
            res.json({
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
        } catch ( error ) {
            reportAlertOperationFailureError( next, error.message )
        }
    }
)


// export router for use in server.js
export default router