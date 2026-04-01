// import required dependencies
import express from 'express'
import { query, header, validationResult, param } from 'express-validator'
import passport from 'passport'
import { ERROR_CODES, reportFetchOperationFaliureError, reportInvalidAssetSymbolError, reportInvalidAuthorizationTokenError, reportInvalidSearchQueryError } from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { getCoinDetails, searchCoinsByQuery } from '../Shared/utils/coingecko.js'


// create a router instance for defining the /assets/* routes
const router = express.Router()


// GET /assets/search?query={query} - search for coins matching the query 
// string using the Coingecko API
router.get("/search", 
    [
        query("query")
            .exists()
            .withMessage( ERROR_CODES.INVALID_SEARCH_QUERY )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_SEARCH_QUERY )
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
            .bail()
    ],
    function(req, res, next) {
        // extract error messages from the validation result
        const errors = validationResult(req)

        // check if there are any validation errors
        // and report the first one if any are found
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_SEARCH_QUERY:
                    return reportInvalidSearchQueryError( next )
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
            }
        }

        // if validation passed, proceed to the next middleware or route handler
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function ( req, res, next ) {
        const { query } = req.query

        const { status, error, data } = await searchCoinsByQuery( query )

        if ( status === "error" ) {
            return reportFetchOperationFaliureError( next )
        } 
        
        return res.json({
            status,
            data: data.coins.map( function( coin ) {
                return {
                    id: coin.id,
                    name: coin.name,
                    image: coin.large,
                }
            })
        })
    }
)


router.get("/:symbol", 
    [
        param("symbol")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
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
            .bail()
    ],
    function( req, res, next ) {
        // extract validation errors from request object
        const errors = validationResult( req )

        // check for validation errors if any
        if ( !errors.isEmpty() ) {
            switch( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_ASSET_SYMBOL:
                    return reportInvalidAssetSymbolError( next )
            }
        }

        // process to next middleware if there are no validation errors
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function( req, res, next ) {
        // extract symbol params data from request 
        const symbol = req.params.symbol

        // extract coin details from coingecko api using the symbol param
        const { status, error, data } = await getCoinDetails( symbol )

        // if there was an error fetching the coin details, 
        // report a fetch operation faliure error with the error message 
        // from the coingecko fetch attempt
        if ( status === "error" ) {
            return reportFetchOperationFaliureError( next, error.message )
        }

        // check if authenticated user has symbol in his watchlist or portfolio
        const authenticatedUser = req.user

        const isInWatchlist = authenticatedUser.watchlist.some( watchlistSymbol => watchlistSymbol === symbol )
        const portfolioAsset = authenticatedUser.portfolio.find( portfolioAsset => portfolioAsset.symbol === symbol )

        // construct response object by adding user portfolio and watchlist data 
        // to the coin details response
        const responseData = {
            id: data.id,
            name: data.name,
            image: data.image.large,
            description: data.description.en,
            price: data.market_data.current_price.usd,
            sparkline: data.market_data.sparkline_7d.price,
            percent_change_24h: data.market_data.price_change_percentage_24h,
            price_change_24h: data.market_data.price_change_24h,
            is_watchlist: false,
            is_portfolio: false
        }

        if ( isInWatchlist ) {
            responseData.is_watchlist = true
        }

        if ( portfolioAsset ) {
            responseData.is_portfolio = true
            responseData.portfolio = {
                units: portfolioAsset.units,
                amount: data.data.market_data.current_price.usd * portfolioAsset.units,
                price_change: data.market_data.price_change_24h * portfolioAsset.units,
            }
        }

        // if the fetch was successful, return a json response with the 
        // destructured coin details
        return res.json({
            status,
            data: responseData
        })
    }
)


export default router