// import required dependencies
import express from 'express'
import { query, header, validationResult } from 'express-validator'
import passport from 'passport'
import { ERROR_CODES, reportFetchOperationFaliureError, reportInvalidAuthorizationTokenError, reportInvalidSearchQueryError } from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { searchCoinsByQuery } from '../Shared/utils/coingecko.js'


// create a router instance for defining the /assets/* routes
const router = express.Router()


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


export default router