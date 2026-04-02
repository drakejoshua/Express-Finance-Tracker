// import required dependencies
import express from 'express'
import { query, header, validationResult, param } from 'express-validator'
import passport from 'passport'
import { ERROR_CODES, reportFetchOperationFaliureError, reportInvalidAssetSymbolError, reportInvalidAuthorizationTokenError, reportInvalidChartDataRangeError, reportInvalidSearchQueryError } from '../Shared/utils/errors.js'
import { validateBearerJWT } from '../Shared/utils/validators.js'
import { getCoinDetails, getCoinMarketChart, searchCoinsByQuery } from '../Shared/utils/coingecko.js'


// create a new router instance
const router = express.Router()





export default router