import express from "express";
import Users from "../Database/Schema/UserSchema.js";
import { query, param, validationResult, header } from "express-validator";
import { ERROR_CODES, reportAssetSearchFailureError, reportInvalidAuthorizationTokenError, reportInvalidSearchTermError } from "../Shared/utils/errors.js";
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
            .bail()
    ],
    async function ( req, res, next ) {
        // validate request parameters and headers
        const errors = validationResult( req )

        // report the first validation error encountered, if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
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

        try {
            const [ stocks, companies, crypto ] = await Promise.all([
                searchFMPStocks( searchQuery ),
                searchFMPCompanies( searchQuery ),
                searchCoingecko( searchQuery )
            ])
            
            return res.json({ status: "success", data: { 
                stocks: stocks.data, 
                companies: companies.data, 
                crypto: crypto.data 
            } })
        } catch( err ) {
            return reportAssetSearchFailureError( next )
        }
    }
)


// export router for use in server.js
export default router