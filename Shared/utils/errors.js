export const ERROR_CODES = {
    INVALID_ROUTE: "INVALID_ROUTE",
    DATABASE_CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR",
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
    INVALID_SEARCH_QUERY: "INVALID_SEARCH_QUERY",


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
InvalidEmailAuthenticationMethodError.code = ERROR_CODES.INVALID_AUTHENTICATION_METHOD

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


// invalid search query error for when a user provides an invalid search 
// query parameter in the request to search for assets
export const InvalidSearchQueryError = new Error("The provided search query is invalid. Please provide a valid search query and try again.")
InvalidSearchQueryError.status = 400
InvalidSearchQueryError.code = ERROR_CODES.INVALID_SEARCH_QUERY

export function reportInvalidSearchQueryError( next ) {
    return next( InvalidSearchQueryError )
}