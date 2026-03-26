import express from "express";
import Users from "../Database/Schema/UserSchema.js";
import { query, param, body, validationResult, header } from "express-validator";
import { ERROR_CODES, reportAssetSearchFailureError, reportInvalidAssetProviderError, reportInvalidAssetQuantityError, reportInvalidAssetSymbolError, reportInvalidAuthorizationTokenError, reportInvalidRequestDataError, reportInvalidRequestQueryError, reportInvalidSearchTermError } from "../Shared/utils/errors.js";
import passport from "passport";
import { validateBearerJWT } from "../Auth/utils/validators.js";
import { getCoingeckoAssetDetails, getFMPAssetDetails, searchCoingecko, searchFMPCompanies, searchFMPStocks } from "./utils/api.js";


const router = express.Router()


// GET /app/portfolio/search/:query - Search for assets to add to the portfolio
// requires a valid JWT in the Authorization header and a search query parameter in the URL
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

// POST /app/portfolio/assets - Add an asset to the user's portfolio
// requires a valid JWT in the Authorization header and asset details in the request body
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

// DELETE /app/portfolio/assets/:symbol?provider={ FMP | Coingecko } - Remove an asset from 
// the user's portfolio requires a valid JWT in the Authorization header and the asset symbol 
// as a URL parameter along with the provider as a query parameter
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


// PUT /app/portfolio/assets/:symbol?provider={ FMP | Coingecko } - Update the units of an asset in the user's portfolio
// requires a valid JWT in the Authorization header, the asset symbol as a URL parameter, 
// the provider as a query parameter and the new units in the request body
router.put("/:symbol",
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
            .bail(),
        body("units")
            .exists()
            .withMessage( ERROR_CODES.INVALID_REQUEST_DATA )
            .bail()
            .isInt({ min: 1 })
            .withMessage( ERROR_CODES.INVALID_REQUEST_DATA )
            .bail()
    ],
    async function ( req, res, next ) {
        // validate request parameters, query parameters, request body and headers
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
                case ERROR_CODES.INVALID_REQUEST_DATA:
                    return reportInvalidRequestDataError( next )
            }
        }

        // if no validation errors, proceed to validate the JWT and update the asset in the user's portfolio
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function ( req, res, next ) {
        // get the authenticated user from the request object 
        // (populated by passport after successful JWT validation)
        const user = req.user

        // get the asset details to be updated from the request parameters, 
        // query parameters and request body
        const symbol = req.params.symbol
        const provider = req.query.provider
        const units = req.body.units

        try {
            // update the asset in the user's portfolio using the updateAsset
            // method defined in the UserSchema
            await user.updateAsset( symbol, provider, units )

            // return the success response indicating the asset was updated 
            // in the portfolio successfully
            return res.json({ status: "success", data: {
                message: "Asset updated in portfolio successfully",
            } })
        } catch( err ) {
            err.message = "An error occurred while trying to update the asset in the portfolio. Please try again later."
            err.code = ERROR_CODES.ASSET_UPDATE_FAILURE
            return next( err )
        }
    }
)

// GET /app/portfolio/assets/:symbol?provider={ FMP | Coingecko } - Get the details of an asset 
// in the user's portfolio requires a valid JWT in the Authorization header, the asset symbol 
// as a URL parameter and the provider as a query parameter
router.get("/:symbol",
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
            .bail(),
        query("chart_limit")
            .optional()
            .isInt({ min: 1, max: 365 })
            .withMessage( ERROR_CODES.INVALID_REQUEST_QUERY )
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
                case ERROR_CODES.INVALID_REQUEST_QUERY:
                    return reportInvalidRequestQueryError( next )
            }
        }

        // if no validation errors, proceed to validate the JWT and get the asset details from the user's portfolio
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function ( req, res, next ) {
        // get the authenticated user from the request object 
        // (populated by passport after successful JWT validation)
        const user = req.user

        // get the asset details to be retrieved from the request parameters and query parameters
        const symbol = req.params.symbol
        const provider = req.query.provider
        const chartLimit = req.query.chart_limit || 7

        // get asset details from FMP or Coingecko based on the provider specified in the query parameter
        try {
            let assetDetails

            if ( provider === "fmp" ) {
                assetDetails = await getFMPAssetDetails( symbol, chartLimit )
            } else if ( provider === "coingecko" ) {
                assetDetails = await getCoingeckoAssetDetails( symbol, chartLimit )
            }

            if ( assetDetails.status === "error" ) {
                throw new Error( "" )
            }

            // get the asset from the user's portfolio to retrieve the units field
            const portfolioAsset = user.portfolio.find( function ( item ) {
                return item.symbol === symbol && item.provider === provider
            })

            return res.json({ status: "success", data: {
                ...assetDetails.data,
                symbol,
                provider,
                units: portfolioAsset?.units || 0
            } })
        } catch( err ) {
            console.error( err )
            reportAssetSearchFailureError( next )
        }
    }
)


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
            .isInt({ min: 1, max: 100 })
            .withMessage( ERROR_CODES.INVALID_REQUEST_QUERY )
            .bail()
    ],
    async function ( req, res, next ) {
        // validate request query parameters and headers
        const errors = validationResult( req )

        // report the first validation error encountered, if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
                case ERROR_CODES.INVALID_REQUEST_QUERY:
                    return reportInvalidRequestQueryError( next )
            }
        }

        // if no validation errors, proceed to validate the JWT and get the list of assets in the user's portfolio with pagination and sorting
        next()
    },
    passport.authenticate("jwt", { session: false }),
    async function ( req, res, next ) {
        // get the authenticated user from the request object 
        // (populated by passport after successful JWT validation)
        const user = req.user

        // get pagination and sorting details from query parameters
        const limit = req.query.limit || 10

        try {
            // get the list of assets in the user's portfolio with pagination and sorting
            const portfolioAssets = user.portfolio.slice( 0, limit )

            // fetch the details of each asset in the portfolio from FMP or Coingecko based 
            // on the provider specified for each asset
            const portfolioAssetsDetails = await Promise.all(
                portfolioAssets.map( function( asset ) {
                    if ( asset.provider === "fmp" ) {
                        return getFMPAssetDetails( asset.symbol )
                    } else { 
                        return getCoingeckoAssetDetails( asset.symbol )
                    }
                } )
            )

            if ( portfolioAssetsDetails.some( asset => asset.status === "error" ) ) {
                throw new Error( "" )
            }

            // combine the asset details with the units field from the user's portfolio and return in the response
            const responseData = portfolioAssets.map( function( asset, index ) {
                const assetDetails = portfolioAssetsDetails[index]
                const cleanAsset = asset.toObject()

                return {
                    ...assetDetails.data,
                    ...cleanAsset,
                    units: cleanAsset.units || 0
                }
            } )

            return res.json({ status: "success", data: responseData })
        } catch( err ) {
            return reportAssetSearchFailureError( next )
        }
    }
)


// export router for use in server.js
export default router