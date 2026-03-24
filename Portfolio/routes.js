import express from "express";
import Users from "../Database/Schema/UserSchema.js";
import { query, param, validationResult, header } from "express-validator";
import { ERROR_CODES, reportAssetSearchFailureError, reportInvalidAuthorizationTokenError, reportInvalidSearchQueryError, reportInvalidSearchTermError } from "../Shared/utils/errors.js";
import passport from "passport";
import { validateBearerJWT } from "../Auth/utils/validators.js";
import { searchCoingecko, searchFMPCompanies, searchFMPStocks } from "./utils/api.js";


const router = express.Router()

router.get("/search/:query",
    [
        param("query")
            .exists()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_SEARCH_TERM )
            .bail()
            .isLength({ min: 1, max: 100 })
            .withMessage( ERROR_CODES.INVALID_SEARCH_TERM )
            .bail(),
        header("Authorization")
            .exists()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail()
            .custom( validateBearerJWT )
            .withMessage( ERROR_CODES.INVALID_AUTHORIZATION_TOKEN )
            .bail(),
        query("type")
            .optional()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_SEARCH_QUERY )
            .bail()
            .isIn([ "all", "symbol", "crypto", "name" ])
            .withMessage( ERROR_CODES.INVALID_SEARCH_QUERY )
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
                case ERROR_CODES.INVALID_SEARCH_TERM:
                    return reportInvalidSearchTermError( next )
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
        const searchType = req.query.type || "all"

        try {
            // search the coingecko and fmp API's for assets using the search query 
            // and return results
            let searchResults = {
                stocks: [],
                companies: [],
                crypto: []
            }
            let errorOccurred = false

            switch ( searchType ) {
                case "all":
                    const [ stocks, companies, crypto ] = await Promise.all([
                        searchFMPStocks( searchQuery ),
                        searchFMPCompanies( searchQuery ),
                        searchCoingecko( searchQuery )
                    ])

                    if ( stocks.status === "success" ) {
                        searchResults.stocks = stocks.data
                    } else {
                        errorOccurred = true
                    }
                    
                    if ( companies.status === "success" ) {
                        searchResults.companies = companies.data
                    } else {
                        errorOccurred = true
                    }
                    
                    if ( crypto.status === "success" ) {
                        searchResults.crypto = crypto.data
                    } else {
                        errorOccurred = true
                    }
                break;

                case "symbol":
                    const stocksResult = await searchFMPStocks( searchQuery )

                    if ( stocksResult.status === "success" ) {
                        searchResults.stocks = stocksResult.data
                    } else {
                        errorOccurred = true
                    }
                break;

                case "name":
                    const companiesResult = await searchFMPCompanies( searchQuery )

                    if ( companiesResult.status === "success" ) {
                        searchResults.companies = companiesResult.data
                    } else {
                        errorOccurred = true
                    }
                break;

                case "crypto":
                    const cryptoResult = await searchCoingecko( searchQuery )

                    if ( cryptoResult.status === "success" ) {
                        searchResults.crypto = cryptoResult.data
                    } else {
                        errorOccurred = true
                    }
                break;
            }

            // send the compiled response
            if ( errorOccurred ) {
                return reportAssetSearchFailureError( next )
            }

            return res.json({ status: "success", data: searchResults })
        } catch ( error ) {
            // if there's an error during the search process, pass it to the error handling middleware
            return next( error )
        }
    }
)


// export router for use in server.js
export default router