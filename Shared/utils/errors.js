export const ERROR_CODES = {
    // general errors
    INVALID_ROUTE: "INVALID_ROUTE",
    DATABASE_CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR",

    // authentication and user errors
    INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
    INVALID_EMAIL: "INVALID_EMAIL",
    INVALID_PASSWORD_FORMAT: "INVALID_PASSWORD_FORMAT",
    INVALID_USERNAME: "INVALID_USERNAME",
    EMAIL_EXISTS: "EMAIL_EXISTS",
    FILE_UPLOAD_ERROR: "FILE_UPLOAD_ERROR",
    EMAIL_NOT_FOUND: "EMAIL_NOT_FOUND",
    INVALID_EMAIL_AUTHENTICATION_METHOD: "INVALID_EMAIL_AUTHENTICATION_METHOD",
    INVALID_GOOGLE_AUTHENTICATION_METHOD: "INVALID_GOOGLE_AUTHENTICATION_METHOD",
    INVALID_PASSWORD: "INVALID_PASSWORD",
    INVALID_AUTHORIZATION_TOKEN: "INVALID_AUTHORIZATION_TOKEN",
    INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
    PROFILE_UPDATE_FAILURE: "PROFILE_UPDATE_FAILURE",

    // asset-related errors
    INVALID_SEARCH_QUERY: "INVALID_SEARCH_QUERY",
    FETCH_OPERATION_FALIURE: "FETCH_OPERATION_FALIURE",
    INVALID_ASSET_SYMBOL: "INVALID_ASSET_SYMBOL",
    INVALID_CHART_DATA_RANGE: "INVALID_CHART_DATA_RANGE",
    INVALID_ASSET_UNITS: "INVALID_ASSET_UNITS",
    PORTFOLIO_OPERATION_FAILURE: "PORTFOLIO_OPERATION_FAILURE",
    ASSET_NOT_FOUND: "ASSET_NOT_FOUND",


    EMAIL_SEND_FAILURE: "EMAIL_SEND_FAILURE"
}

// not found error for invalid routes
export const NotFoundError = new Error("The requested resource was not found on this server.")
NotFoundError.status = 404
NotFoundError.code = ERROR_CODES.INVALID_ROUTE

export function reportNotFoundError( next ) {
    return next( NotFoundError )
}


// database connection error for when database connection fails
export const DatabaseConnectionError = new Error("Failed to connect to the database.")
DatabaseConnectionError.status = 500
DatabaseConnectionError.code = ERROR_CODES.DATABASE_CONNECTION_ERROR

export function reportDatabaseConnectionError( next ) {
    return next( DatabaseConnectionError )
}


// invalid file type error for multer file filter
export const InvalidFileTypeError = new Error("Invalid file type encountered. Only image files are allowed.")
InvalidFileTypeError.status = 400
InvalidFileTypeError.code = ERROR_CODES.INVALID_FILE_TYPE

export function reportInvalidFileTypeError( next ) {
    return next( InvalidFileTypeError )
}


// invalid email error for express-validator email validation
export const InvalidEmailError = new Error("The provided email address is invalid.")
InvalidEmailError.status = 400
InvalidEmailError.code = ERROR_CODES.INVALID_EMAIL

export function reportInvalidEmailError( next ) {
    return next( InvalidEmailError )
}


// invalid password format error for express-validator password validation
export const InvalidPasswordFormatError = new Error("The provided password is invalid. It must be at least 6 characters long.")
InvalidPasswordFormatError.status = 400
InvalidPasswordFormatError.code = ERROR_CODES.INVALID_PASSWORD_FORMAT

export function reportInvalidPasswordFormatError( next ) {
    return next( InvalidPasswordFormatError )
}


// invalid username error for express-validator username validation
export const InvalidUsernameError = new Error("The provided name is invalid. It must be at least 3 characters long.")
InvalidUsernameError.status = 400
InvalidUsernameError.code = ERROR_CODES.INVALID_USERNAME

export function reportInvalidUsernameError( next ) {
    return next( InvalidUsernameError )
}


// email exists error for when a user tries to sign up with 
// an email that already exists in the database
export const EmailExistsError = new Error("The provided email address is already registered with an account.")
EmailExistsError.status = 400
EmailExistsError.code = ERROR_CODES.EMAIL_EXISTS

export function reportEmailExistsError( next ) {
    return next( EmailExistsError )
}


// file upload error for when file upload to cloudinary fails
export const FileUploadError = new Error("There was an error uploading the file. Please try again later.")
FileUploadError.status = 500
FileUploadError.code = ERROR_CODES.FILE_UPLOAD_ERROR

export function reportFileUploadError( next ) {
    return next( FileUploadError )
}


// email not found error for when a user tries to log in with 
// an email that doesn't exist in the database
export const EmailNotFoundError = new Error("The provided email address is not registered with an account. Please check your email and try again.")
EmailNotFoundError.status = 404
EmailNotFoundError.code = ERROR_CODES.EMAIL_NOT_FOUND

export function reportEmailNotFoundError( next ) {
    return next( EmailNotFoundError )
}


// invalid authentication method error for when a user tries to log in with
// an email that is registered with a different authentication method (e.g. Google)
export const InvalidEmailAuthenticationMethodError = new Error("The account associated with the provided email address does not use email-password authentication. Please sign in using the google account option.")
InvalidEmailAuthenticationMethodError.status = 400
InvalidEmailAuthenticationMethodError.code = ERROR_CODES.INVALID_EMAIL_AUTHENTICATION_METHOD

export function reportInvalidEmailAuthenticationMethodError( next ) {
    return next( InvalidEmailAuthenticationMethodError )
}


// invalid authentication method error for when a user tries to log in with
// a Google account that is registered with a different authentication method (e.g. email-password)
export const InvalidGoogleAuthenticationMethodError = new Error("The account associated with the provided email address does not use Google authentication. Please sign in using the email and password option.")
InvalidGoogleAuthenticationMethodError.status = 400
InvalidGoogleAuthenticationMethodError.code = ERROR_CODES.INVALID_GOOGLE_AUTHENTICATION_METHOD

export function reportInvalidGoogleAuthenticationMethodError( next ) {
    return next( InvalidGoogleAuthenticationMethodError )
}


// invalid password error for when a user tries to log in with an incorrect password
export const InvalidPasswordError = new Error("The password you entered is incorrect. Please check your password and try again.")
InvalidPasswordError.status = 400
InvalidPasswordError.code = ERROR_CODES.INVALID_PASSWORD

export function reportInvalidPasswordError( next ) {
    return next( InvalidPasswordError )
}


// invalid authorization token error for when a user provides an invalid JWT in the Authorization header
export const InvalidAuthorizationTokenError = new Error("The provided authorization token is invalid or has expired. Please log in again to obtain a new token.")
InvalidAuthorizationTokenError.status = 401
InvalidAuthorizationTokenError.code = ERROR_CODES.INVALID_AUTHORIZATION_TOKEN

export function reportInvalidAuthorizationTokenError( next ) {
    return next( InvalidAuthorizationTokenError )
}


// invalid refresh token error for when a user provides an invalid refresh token in the request body to obtain a new access token
export const InvalidRefreshTokenError = new Error("The provided refresh token is invalid or has expired. Please log in again to obtain new tokens.")
InvalidRefreshTokenError.status = 401
InvalidRefreshTokenError.code = ERROR_CODES.INVALID_REFRESH_TOKEN

export function reportInvalidRefreshTokenError( next ) {
    return next( InvalidRefreshTokenError )
}


// profile update failure error for when a user tries to update their 
// profile but their profile provider doesn't allow the requested update 
// (e.g. a user with a Google provider tries to update their email or password)
export const ProfileUpdateFailureError = new Error("There was an error updating your profile. Users with Google authentication cannot update their email or password.")
ProfileUpdateFailureError.status = 400
ProfileUpdateFailureError.code = ERROR_CODES.PROFILE_UPDATE_FAILURE

export function reportProfileUpdateFailureError( next ) {
    return next( ProfileUpdateFailureError )
}


// invalid search query error for when a user tries to search for assets with an invalid query parameter
export const InvalidSearchQueryError = new Error("The search term is invalid. Please provide a valid search query.")
InvalidSearchQueryError.status = 400
InvalidSearchQueryError.code = ERROR_CODES.INVALID_SEARCH_QUERY

export function reportInvalidSearchQueryError( next ) {
    return next( InvalidSearchQueryError )
}


// fetch operation faliure error for reporting coingecko api fetch faliures
export const FetchOperationFaliureError = new Error("There an error querying our external data provider, Please try again in a few minutes")
FetchOperationFaliureError.status = 404
FetchOperationFaliureError.code = ERROR_CODES.FETCH_OPERATION_FALIURE

export function reportFetchOperationFaliureError( next, message ) {
    FetchOperationFaliureError.message = `${FetchOperationFaliureError.message}. ${ message || "" }`
    return next( FetchOperationFaliureError )
}

// fetch operation faliure error for reporting coingecko api fetch faliures
export const InvalidAssetSymbolError = new Error("The asset symbol is empty or invalid. Asset symbols needs to be at least 1 chars long.")
InvalidAssetSymbolError.status = 400
InvalidAssetSymbolError.code = ERROR_CODES.INVALID_ASSET_SYMBOL

export function reportInvalidAssetSymbolError( next ) {
    return next( InvalidAssetSymbolError )
}


// invalid chart data range error for when a user tries to fetch asset chart 
// data with an invalid range query parameter
export const InvalidChartDataRangeError = new Error("The chart data range parameter is invalid. Valid range values are: 1d, 7d, 30d, 90d, 180d, 365d.")
InvalidChartDataRangeError.status = 400
InvalidChartDataRangeError.code = ERROR_CODES.INVALID_CHART_DATA_RANGE

export function reportInvalidChartDataRangeError( next ) {
    return next( InvalidChartDataRangeError )
}


// invalid asset units error for when a user tries to add an asset to 
// their portfolio with invalid units (e.g. negative units or non-numeric units)
export const InvalidAssetUnitsError = new Error("The asset units value is empty or invalid. Units must be greater than zero.")
InvalidAssetUnitsError.status = 400
InvalidAssetUnitsError.code = ERROR_CODES.INVALID_ASSET_UNITS

export function reportInvalidAssetUnitsError( next ) {
    return next( InvalidAssetUnitsError )
}


// portfolio operation failure error for when a user tries to perform an operation 
// on their portfolio but the operation fails for some reason (e.g. database error)
export const PortfolioOperationFailureError = new Error("There was an error performing the requested operation on your portfolio. Please try again later.")
PortfolioOperationFailureError.status = 500
PortfolioOperationFailureError.code = ERROR_CODES.PORTFOLIO_OPERATION_FAILURE

export function reportPortfolioOperationFailureError( next, message ) {
    PortfolioOperationFailureError.message = `${PortfolioOperationFailureError.message}. ${ message || "" }`
    return next( PortfolioOperationFailureError )
}


// asset not found error for when a user tries to perform an operation on an asset 
// that doesn't exist in their portfolio
export const AssetNotFoundError = new Error("The specified asset was not found in your portfolio or watchlist. Please check the asset symbol and try again.")
AssetNotFoundError.status = 404
AssetNotFoundError.code = ERROR_CODES.ASSET_NOT_FOUND

export function reportAssetNotFoundError( next ) {
    return next( AssetNotFoundError )
}