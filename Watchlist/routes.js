import express from 'express'
import { query, header, body, validationResult, param } from 'express-validator'
import passport from 'passport'
import { ERROR_CODES, reportAssetNotFoundError, reportFetchOperationFaliureError, reportInvalidAssetSymbolError, reportInvalidAssetUnitsError, reportInvalidAuthorizationTokenError, reportInvalidChartDataRangeError, reportInvalidPortfolioQueryError, reportInvalidSearchQueryError, reportPortfolioOperationFailureError, reportWatchlistOperationFailureError } from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { getBatchCoinsDetails, getCoinDetails, getCoinMarketChart, searchCoinsByQuery } from '../Shared/utils/coingecko.js'
import { roundToTwoDecimalPlaces, sliceAndJoinArrayIntoChunksUsingLimit } from '../Shared/utils/helpers.js'


// Initialize the router
const router = express.Router()


// POST /app/watchlist - Add an asset to the user's watchlist using the asset
//  symbol provided in the request body. Requires authentication via Bearer 
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


// export the router for use in server.js
export default router