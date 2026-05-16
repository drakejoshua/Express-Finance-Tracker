import express from 'express'
import { query, header, body, validationResult, param } from 'express-validator'
import passport from 'passport'
import { 
    ERROR_CODES, 
    reportAssetNotFoundError, 
    reportFetchOperationFaliureError, 
    reportInvalidAssetSymbolError, 
    reportInvalidAuthorizationTokenError, 
    reportInvalidPortfolioQueryError, 
    reportPortfolioOperationFailureError, 
    reportWatchlistOperationFailureError 
} from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { getBatchCoinsDetails } from '../Shared/utils/coingecko.js'
import { roundToTwoDecimalPlaces, sliceAndJoinArrayIntoChunksUsingLimit } from '../Shared/utils/helpers.js'


// Initialize the router
const router = express.Router()


// GET /app/watchlist?limit={ int } - get the authenticated user's watchlist with current price, 
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

            // split the authenticated-user watchlist array into a compiled array which contains strings as 
            // a comma-seperated list of 49 symbols each. This is done to allow batch fetching of coin
            // details from the coingecko API
            let results = sliceAndJoinArrayIntoChunksUsingLimit( 
                authenticatedUser.watchlist, 49 
            )

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

            // since the fetched portfolio data has succesfully been extracted and 
            // transformed, send response containing all required information from endpoint
            res.json({
                status: "success",
                data: {
                    // id: coinDetails.id,
                    // name: coinDetails.name,
                    // image: coinDetails.image,
                    // price: coinDetails.current_price,
                    // sparkline: coinDetails.sparkline_in_7d.price.map( ( price ) => price ),
                    // percent_change_24h: coinDetails.price_change_percentage_24h,
                    // price_change_24h: coinDetails.price_change_24h,
                    total_assets: batchCoinsDetails.length,
                    assets: batchCoinsDetails.slice( 0, limit ).map(asset => ({
                        id: asset.id,
                        name: asset.name,
                        image: asset.image,
                        price: roundToTwoDecimalPlaces(asset.current_price),
                        percent_change_24h: roundToTwoDecimalPlaces(asset.price_change_percentage_24h),
                        price_change_24h: roundToTwoDecimalPlaces(asset.price_change_24h),
                        sparkline: asset.sparkline_in_7d.price.map( roundToTwoDecimalPlaces )
                    }))
                }
            })


        } catch ( error ) {
            return reportFetchOperationFaliureError( next, error.message )
        }
    }
)


// POST /app/watchlist - Add an asset to the user's watchlist using the asset
// symbol provided in the request body. Requires authentication via Bearer 
// JWT token in the Authorization header.
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
                default:
                    return reportPortfolioOperationFailureError( next )
            }
        }

        // proceed to the other route handlers if there are no validation errors
        next()
    },
    passport.authenticate("jwt", { session: false } ),
    async function( req, res, next ) {
        try {
            // get the authenticated user and asset symbol from the request
            const user = req.user
            const { symbol } = req.body

            // add the asset to the user's watchlist using the 
            // addAssetToWatchlist method
            await user.addAssetToWatchlist( symbol )

            // return a success response indicating that the asset was added to the
            // watchlist successfully
            return res.json({
                status: "success",
                data: {
                    message: "Asset added to watchlist successfully"
                }
            })
        } catch( error ) {
            return reportWatchlistOperationFailureError( next, error.message )
        }
    }
)


// DELETE /app/watchlist - Remove an asset from the user's watchlist using the asset
// symbol provided in the request body. Requires authentication via Bearer 
// JWT token in the Authorization header.
router.delete("/:symbol",
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
        param("symbol")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
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
            }
        }

        // proceed to the other route handlers if there are no validation errors
        next()
    },
    passport.authenticate("jwt", { session: false } ),
    async function( req, res, next ) {
        try {
            // get the authenticated user and asset symbol from the request
            const user = req.user
            const { symbol } = req.params

            // check if the asset exists in the user's watchlist by matching 
            // the symbol
            if ( !user.watchlist.includes( symbol ) ) {
                return reportAssetNotFoundError( next )
            }

            // remove the asset from the user's watchlist using the 
            // removeAssetFromWatchlist method on the user document
            await user.removeAssetFromWatchlist( symbol )

            // return a success response indicating that the asset was 
            // removed from the watchlist successfully
            return res.json({
                status: "success",
                data: {
                    message: "Asset removed from watchlist successfully"
                }
            })
        } catch( error ) {
            return reportWatchlistOperationFailureError( next, error.message )
        }
    }
)


// export the router for use in server.js
export default router