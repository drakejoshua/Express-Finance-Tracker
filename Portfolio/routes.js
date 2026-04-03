// import required dependencies
import express from 'express'
import { query, header, body, validationResult, param } from 'express-validator'
import passport from 'passport'
import { ERROR_CODES, reportAssetNotFoundError, reportFetchOperationFaliureError, reportInvalidAssetSymbolError, reportInvalidAssetUnitsError, reportInvalidAuthorizationTokenError, reportInvalidChartDataRangeError, reportInvalidPortfolioQueryError, reportInvalidSearchQueryError, reportPortfolioOperationFailureError } from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { getBatchCoinsDetails, getCoinDetails, getCoinMarketChart, searchCoinsByQuery } from '../Shared/utils/coingecko.js'
import { roundToTwoDecimalPlaces, sliceAndJoinArrayIntoChunksUsingLimit } from '../Shared/utils/helpers.js'


// create a new router instance
const router = express.Router()


// GET /app/portfolio?limit={ int } - get the authenticated user's portfolio with current price, 
// sparkline data, details for each asset and total portfolio summary. Requires a valid JWT token 
// in the Authorization header.
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
            .isInt({ gt: 0 })
            .withMessage( ERROR_CODES.INVALID_PORTFOLIO_QUERY )
            .bail()
    ],
    function( req, res, next ) {
        // extract validation errors from the request if any
        const errors = validationResult( req )

        // check if there are validation errors and return the first error message if any
        if ( !errors.isEmpty() ) {
            switch ( errors.array()[0].msg ) {
                case ERROR_CODES.INVALID_PORTFOLIO_QUERY:
                    return reportInvalidPortfolioQueryError( next )
                case ERROR_CODES.INVALID_AUTHORIZATION_TOKEN:
                    return reportInvalidAuthorizationTokenError( next )
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

            // extract the optional limit query param from the request
            const limit = req.query.limit || 10

            // fetch all portfolio data from authenticated user document to calculate 
            // the portfolio summary and return each asset's details and sparkline
            let portfolioData = authenticatedUser.portfolio.map( ( asset ) => asset.symbol )

            // split the authenticated-user portfolio array into a compiled array contains string as 
            // a comma-seperated list of 49 symbols each. This is done to allow batch fetching of coin
            // details from the coingecko API
            let results = sliceAndJoinArrayIntoChunksUsingLimit( portfolioData, 49 )

            // fetch details of the resulting symbol lists from coingecko at once
            let batchCoinsDetailsResp = await Promise.all( results.map( function( symbols_ids ) {
                return getBatchCoinsDetails( symbols_ids )
            }))

            // combine all the batch-fetched coin details into a flat array instead of the 
            // normal response format gotten from the coingecko helper function
            let batchCoinsDetails = []

            batchCoinsDetailsResp.forEach( function( coinBatch ) {
                if ( coinBatch.status === "error" ) {
                    throw new Error( coinBatch.error.message )
                }

                batchCoinsDetails.push( ...coinBatch.data.map( ( coinDetails ) => coinDetails ) )
            })



            // get populated portfolio assets by mixing the data gotten from coingecko with the 
            // authenticated-user portfolio data
            let populatedPortfolioAssets = batchCoinsDetails.map( function( coinDetails ) {
                const portfolioAssetDetails = authenticatedUser.portfolio.find( ( asset ) => coinDetails.id === asset.symbol )

                return {
                    id: coinDetails.id,
                    name: coinDetails.name,
                    image: coinDetails.image,
                    price: coinDetails.current_price,
                    sparkline: coinDetails.sparkline_in_7d.price.map( ( price ) => price ),
                    percent_change_24h: coinDetails.price_change_percentage_24h,
                    price_change_24h: coinDetails.price_change_24h,
                    balance: coinDetails.current_price * portfolioAssetDetails.units,
                    balance_change_24h: coinDetails.price_change_24h * portfolioAssetDetails.units
                }
            })

            // sort the populated portfolio assets in descending order ino order to
            // get the top losers and top gainers in the users portfolio
            let sortedPortfolioAssets = [...populatedPortfolioAssets].sort( function( prev, next ) {
                return ( next.percent_change_24h > prev.percent_change_24h ) 
                    ? 1 : ( next.percent_change_24h === prev.percent_change_24h ) ? 0 : -1
            })

            // get the total accmulated balance and total_percent_change of all the assets 
            // in the authenticated-user's portfolio
            let totalPortfolioBalance = 0
            let totalChange = 0

            populatedPortfolioAssets.forEach( function( asset ) {
                totalPortfolioBalance += asset.balance
                totalChange += asset.balance_change_24h
            })

            // since the fetched portfolio data has succesfully been extracted and 
            // transformed, send response containing all required information from endpoint
            res.json({
                status: "success",
                data: {
                    summary: {
                        balance: roundToTwoDecimalPlaces( totalPortfolioBalance ),
                        total_percent_change: roundToTwoDecimalPlaces( ( (totalChange / totalPortfolioBalance) * 100 ) ),
                        top_gainers: sortedPortfolioAssets.slice( 0, 3 ).map(({ sparkline, ...asset }) => ({
                            ...asset,
                            price: roundToTwoDecimalPlaces(asset.price),
                            percent_change_24h: roundToTwoDecimalPlaces(asset.percent_change_24h),
                            price_change_24h: roundToTwoDecimalPlaces(asset.price_change_24h),
                            balance: roundToTwoDecimalPlaces(asset.balance),
                            balance_change_24h: roundToTwoDecimalPlaces(asset.balance_change_24h),
                        })),
                        top_losers: sortedPortfolioAssets.slice( -3 ).map(({ sparkline, ...asset }) => ({
                            ...asset,
                            price: roundToTwoDecimalPlaces(asset.price),
                            percent_change_24h: roundToTwoDecimalPlaces(asset.percent_change_24h),
                            price_change_24h: roundToTwoDecimalPlaces(asset.price_change_24h),
                            balance: roundToTwoDecimalPlaces(asset.balance),
                            balance_change_24h: roundToTwoDecimalPlaces(asset.balance_change_24h),
                        }))
                    },
                    total_assets: populatedPortfolioAssets.length,
                    assets: populatedPortfolioAssets.slice( 0, limit ).map(asset => ({
                        ...asset,
                        price: roundToTwoDecimalPlaces(asset.price),
                        percent_change_24h: roundToTwoDecimalPlaces(asset.percent_change_24h),
                        price_change_24h: roundToTwoDecimalPlaces(asset.price_change_24h),
                        balance: roundToTwoDecimalPlaces(asset.balance),
                        balance_change_24h: roundToTwoDecimalPlaces(asset.balance_change_24h),
                        sparkline: asset.sparkline.map( roundToTwoDecimalPlaces )
                    }))
                }
            })


        } catch ( error ) {
            return reportFetchOperationFaliureError( next, error.message )
        }
    }
)


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
            await authenticatedUser.addAssetToPortfolio({ symbol, units: parseInt( units ) })

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


// DELETE /app/portfolio/:symbol - remove an asset from the authenticated user's portfolio using the
// asset symbol provided in the request params. Requires a valid JWT token in the Authorization header.
router.delete("/:symbol",
    [
        param("symbol")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL)
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL)
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

            // extract the asset symbol from the request params
            const { symbol } = req.params

            // check if the asset exists in the user's portfolio before trying to remove it, 
            // and return an error if not found
            if ( !authenticatedUser.portfolio.find( ( item ) => item.symbol === symbol ) ) {
                return reportAssetNotFoundError( next )
            }

            // remove the asset from the user's portfolio in the database
            await authenticatedUser.removeAssetFromPortfolio( symbol )

            // return a success response with the updated portfolio data
            return res.status(204).json({
                status: "success",
                data: {
                    message: `Successfully removed ${ symbol } from portfolio.`,
                }
            })
        } catch ( error ) {
            return reportPortfolioOperationFailureError( next, error.message )
        }
    }
)


// PUT /app/portfolio/:symbol - update the quantity of an asset in the authenticated user's portfolio 
// using the asset symbol provided in the request params and the new quantity provided in the request body.
// Requires a valid JWT token in the Authorization header.
router.put("/:symbol",
    [
        param("symbol")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL)
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_SYMBOL)
            .bail(),
        body("units")
            .exists()
            .withMessage( ERROR_CODES.INVALID_ASSET_UNITS )
            .bail()
            .notEmpty()
            .withMessage( ERROR_CODES.INVALID_ASSET_UNITS )
            .bail()
            .isInt({ gt: 0 })
            .withMessage( ERROR_CODES.INVALID_ASSET_UNITS )
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
        // extract validation errors from the request if any
        const errors = validationResult( req )

        // check if there are validation errors and return the 
        // first error message if any
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

            // extract the asset symbol from the request params and the 
            // new quantity from the request body
            const { symbol } = req.params
            const { units } = req.body

            // check if the asset exists in the user's portfolio before trying to update it,
            // and return an error if not found
            if ( !authenticatedUser.portfolio.find( ( item ) => item.symbol === symbol ) ) {
                return reportAssetNotFoundError( next )
            }

            // update the asset quantity in the user's portfolio in the database
            await authenticatedUser.updateAssetToPortfolio( symbol, parseInt( units ) )

            // return a success response with the updated portfolio data
            return res.json({
                status: "success",
                data: {
                    message: `Successfully updated ${ symbol } in portfolio.`
                }
            })
        } catch ( error ) {
            return reportPortfolioOperationFailureError( next, error.message )
        }
    }
)


export default router