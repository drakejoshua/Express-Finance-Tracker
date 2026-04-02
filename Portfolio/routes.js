// import required dependencies
import express from 'express'
import { query, header, body, validationResult, param } from 'express-validator'
import passport from 'passport'
import { ERROR_CODES, reportFetchOperationFaliureError, reportInvalidAssetSymbolError, reportInvalidAssetUnitsError, reportInvalidAuthorizationTokenError, reportInvalidChartDataRangeError, reportInvalidSearchQueryError, reportPortfolioOperationFailureError } from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { getCoinDetails, getCoinMarketChart, searchCoinsByQuery } from '../Shared/utils/coingecko.js'


// create a new router instance
const router = express.Router()


// POST /app/portfolio/ - add an asset to the authenticated user's portfolio using the 
// asset symbol and units provided in the request body. Requires a valid JWT token in the 
// Authorization header.
router.post("/", 
    [
        body("symbol")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL)
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL)
            .bail(),
        body("units")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_UNITS)
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_UNITS)
            .bail()
            .isInt({ gt: 0 })
            .withMessage( ERROR_CODES.INVALID_ASSET_UNITS)
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
    ],
    function( req, res, next ) {
        // extract validation errors from the request if any
        const errors = validationResult( req )

        // check if there are validation errors and return the first error message if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_ASSET_SYMBOL:
                    return reportInvalidAssetSymbolError( next )
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_ASSET_UNITS:
                    return reportInvalidAssetUnitsError( next )
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

            // extract the asset symbol and units from the request body
            const { symbol, units } = req.body

            // add the asset to the user's portfolio in the database
            await authenticatedUser.addAssetToPortfolio({ symbol, units })

            // return a success response with the updated portfolio data
            return res.json({
                status: "success",
                data: {
                    message: `Successfully added ${units} units of ${symbol} to portfolio.`,
                }
            })
        } catch ( error ) {
            return reportPortfolioOperationFailureError( next, error.message )
        }
    }
)


export default router