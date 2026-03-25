import express from "express";
import Users from "../Database/Schema/UserSchema.js";
import { query, param, body, validationResult, header } from "express-validator";
import { ERROR_CODES, reportAssetSearchFailureError, reportInvalidAssetProviderError, reportInvalidAssetQuantityError, reportInvalidAssetSymbolError, reportInvalidAuthorizationTokenError, reportInvalidSearchTermError } from "../Shared/utils/errors.js";
import passport from "passport";
import { validateBearerJWT } from "../Auth/utils/validators.js";
import { searchCoingecko, searchFMPCompanies, searchFMPStocks } from "./utils/api.js";


const router = express.Router()

router.get("/search/:query",
    [
        param("query")
            .exists()
            .withMessage( ERROR_CODES.INVALID_SEARCH_TERM )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_SEARCH_TERM )
            .bail()
            .isLength({ min: 1, max: 100 })
            .withMessage( ERROR_CODES.INVALID_SEARCH_TERM )
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
            .isLength({ min: 1, max: 20 })
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
            .bail(),
        body("units")
            .optional()
            .isInt({ min: 1 })
            .withMessage( ERROR_CODES.INVALID_ASSET_QUANTITY )
            .bail(),
        body("provider")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_PROVIDER )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_PROVIDER )
            .bail()
            .isIn([ "fmp", "coingecko" ])
            .withMessage( ERROR_CODES.INVALID_ASSET_PROVIDER )
            .bail()
    ],
    async function ( req, res, next ) {
        // validate request parameters and headers
        const errors = validationResult( req )

        // report the first validation error encountered, if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_ASSET_SYMBOL:
                    return reportInvalidAssetSymbolError( next )
                case ERROR_CODES.INVALID_ASSET_QUANTITY:
                    return reportInvalidAssetQuantityError( next )
                case ERROR_CODES.INVALID_ASSET_PROVIDER:
                    return reportInvalidAssetProviderError( next )
            }
        }

        // if no validation errors, proceed to validate the JWT and add the asset to the user's portfolio
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function ( req, res, next ) {
        // get the authenticated user from the request object 
        // (populated by passport after successful JWT validation)
        const user = req.user

        // default the units field to 1 if it's not provided in the request body
        req.body.units = req.body.units || 1

        // get the asset details to be added from the request body
        const { symbol, units, provider } = req.body

        try {
            // add the asset to the user's portfolio using the addAsset 
            // method defined in the UserSchema
            await user.addAsset( {
                symbol,
                units,
                provider
            } )
            
            // return the updated user profile data in the response, 
            // excluding sensitive information
            return res.json({ status: "success", data: {
                message: "Asset added to portfolio successfully",
            } })
        } catch( err ) {
            err.message = "An error occurred while trying to add the asset to the portfolio. Please try again later."
            err.code = ERROR_CODES.ASSET_ADDITION_FAILURE
            return next( err )
        }
    }
)

router.delete("/:symbol",
    [
        param("symbol")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL )
            .bail()
            .isLength({ min: 1, max: 20 })
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
            .bail(),
        query("provider")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_PROVIDER )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_PROVIDER )
            .bail()
            .isIn([ "fmp", "coingecko" ])
            .withMessage( ERROR_CODES.INVALID_ASSET_PROVIDER )
            .bail()
    ],
    async function ( req, res, next ) {
        // validate request parameters, query parameters and headers
        const errors = validationResult( req )

        // report the first validation error encountered, if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_ASSET_SYMBOL:
                    return reportInvalidAssetSymbolError( next )
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_ASSET_PROVIDER:
                    return reportInvalidAssetProviderError( next )
            }
        }

        // if no validation errors, proceed to validate the JWT and delete the asset from the user's portfolio
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function ( req, res, next ) {
        // get the authenticated user from the request object 
        // (populated by passport after successful JWT validation)
        const user = req.user

        // get the asset details to be deleted from the request parameters and query parameters
        const symbol = req.params.symbol
        const provider = req.query.provider

        try {
            // delete the asset from the user's portfolio using the deleteAsset
            // method defined in the UserSchema
            await user.removeAsset( symbol, provider )

            // return the success response indicating the asset was removed 
            // from the portfolio successfully
            return res.json({ status: "success", data: {
                message: "Asset removed from portfolio successfully",
            } })
        } catch( err ) {
            err.message = "An error occurred while trying to remove the asset from the portfolio. Please try again later."
            err.code = ERROR_CODES.ASSET_DELETION_FAILURE
            return next( err )
        }
    }
)


// export router for use in server.js
export default router