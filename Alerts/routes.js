// import necessary modules and utilities
import express from "express"
import { body, header, validationResult } from "express-validator"
import passport from "passport"
import { ERROR_CODES, reportInvalidAssetSymbolError, reportInvalidAuthorizationTokenError } from "../Shared/utils/errors.js"
import { validateBearerJWT } from "../Shared/utils/validators.js"

// Initialize router
const router = express.Router()



// export router for use in server.js
export default router