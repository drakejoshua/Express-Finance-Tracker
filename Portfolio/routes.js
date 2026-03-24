import express from "express";
import Users from "../Database/Schema/UserSchema.js";
import { query, param, validationResult, header } from "express-validator";
import { ERROR_CODES, reportInvalidSearchQueryError } from "../Shared/utils/errors.js";
import passport from "passport";
import { validateBearerJWT } from "../Auth/utils/validators.js";


// Coingecko API configuration
const CoingeckoAPIKey = process.env.COINGECKO_API_KEY
const CoingeckoAPIBaseURL = process.env.COINGECKO_API_BASE_URL

// Financial Modeling Prep API configuration
const FMPAPIKey = process.env.FMP_API_KEY
const FMPAPIBaseURL = process.env.FMP_API_BASE_URL

// Coingecko Specific API routes
async function searchCoingecko(query) {
    try {
        // Search coingecko's /coins/markets endpoint for assets matching the search query in either the name or symbol fields
        const resp = await fetch(`${CoingeckoAPIBaseURL}/coins/markets?vs_currency=usd&names=${encodeURIComponent(query)}&symbols=${encodeURIComponent(query)}&x_cg_demo_api_key=${CoingeckoAPIKey}`)

        // check if response is ok, if not throw an error to be caught in the catch block
        if ( !resp.ok ) {
            throw new Error(`Coingecko API error: ${resp.status} ${resp.statusText}`)
        }

        // parse success response data as JSON
        let data = await resp.json()

        // add coingecko as provider field to each item in the data array so the frontend knows 
        // which API the search result came from
        data = data.map( function ( item ) {
            return { ...item, provider: "coingecko" }
        } )

        // return search results as success status with data
        return { status: "success", data }
    } catch ( error ) {
        console.log("Error searching Coingecko API:", error.message)
        return { status: "error", error: error.message }
    }
}

// FMP Specific API routes
async function searchFMP(query) {
    try {
        // search FMP's API for assets matching the search query
        const resp = await fetch(`${FMPAPIBaseURL}/search-symbol?apikey=${FMPAPIKey}&query=${encodeURIComponent(query)}`);

        // check if response is ok, if not throw an error to be caught in the catch block
        if ( !resp.ok ) {
            throw new Error(`FMP API error: ${resp.status} ${resp.statusText}`)
        }

        // parse success response data as JSON
        let data = await resp.json()

        // transform response data removing any crypto since FMP is not used for crypto assets
        data = data.filter( function ( item ) {
            return item.exchange !== "CRYPTO" || item.exchangeFullName !== "CCC"
        })

        // add FMP as provider field to each item in the data array so the frontend knows 
        // which API the search result came from
        data = data.map( function ( item ) {
            return { ...item, provider: "FMP" }
        } )

        // return search results as success status with data
        return { status: "success", data }
    } catch ( error ) {
        console.log("Error searching FMP API:", error.message)
        return { status: "error", error: error.message }
    }
}

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