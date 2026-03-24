import express from "express";
import Users from "../Database/Schema/UserSchema.js";
import { query, param, validationResult, header } from "express-validator";
import { ERROR_CODES, reportInvalidAuthorizationTokenError, reportInvalidSearchQueryError } from "../Shared/utils/errors.js";
import passport from "passport";
import { validateBearerJWT } from "../Auth/utils/validators.js";
import { searchCoingecko, searchFMP } from "./utils/api.js";


const router = express.Router()

router.get("/search/:query",
    [
        param("query")
            .exists()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_SEARCH_QUERY )
            .bail()
            .isLength({ min: 1, max: 100 })
            .withMessage( ERROR_CODES.INVALID_SEARCH_QUERY )
            .bail(),
        header("Authorization")
            .exists()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .custom( validateBearerJWT )
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
    ],
    async function ( req, res, next ) {
        // validate request parameters and headers
        const errors = validationResult( req )

        // report the first validation error encountered, if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_SEARCH_QUERY:
                    return reportInvalidSearchQueryError( next )
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
            }
        }

        // if no validation errors, proceed to validate the JWT and search for assets
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function ( req, res, next ) {
        const searchQuery = req.params.query

        try {
            // search the coingecko and fmp API's for assets using the search query 
            // and return results
            const searchResults = await Promise.all([
                // search FMP API for assets matching the search query
                searchFMP( searchQuery ),

                // search coingecko API for assets matching the search query
                searchCoingecko( searchQuery )
            ])

            // compile results from both APIs into a single response object
            const responseData = []

            if ( searchResults[0].status === "success" ) {
                responseData.push(...searchResults[0].data )
            }

            if ( searchResults[1].status === "success" ) {
                responseData.push(...searchResults[1].data )
            }

            // send the compiled response
            res.json({ status: "success", data: responseData })
        } catch ( error ) {
            // if there's an error during the search process, pass it to the error handling middleware
            return next( error )
        }
    }
)


// export router for use in server.js
export default router