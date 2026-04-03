import express from 'express'
import { query, header, body, validationResult, param } from 'express-validator'
import passport from 'passport'
import { ERROR_CODES, reportAssetNotFoundError, reportFetchOperationFaliureError, reportInvalidAssetSymbolError, reportInvalidAssetUnitsError, reportInvalidAuthorizationTokenError, reportInvalidChartDataRangeError, reportInvalidPortfolioQueryError, reportInvalidSearchQueryError, reportPortfolioOperationFailureError } from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { getBatchCoinsDetails, getCoinDetails, getCoinMarketChart, searchCoinsByQuery } from '../Shared/utils/coingecko.js'
import { roundToTwoDecimalPlaces, sliceAndJoinArrayIntoChunksUsingLimit } from '../Shared/utils/helpers.js'


// Initialize the router
const router = express.Router()



// export the router for use in server.js
export default router