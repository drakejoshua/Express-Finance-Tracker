export const ERROR_CODES = {
    INVALID_ROUTE: "INVALID_ROUTE",
    DATABASE_CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR",
    INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
    INVALID_EMAIL: "INVALID_EMAIL",
    INVALID_PASSWORD_FORMAT: "INVALID_PASSWORD_FORMAT",
    INVALID_USERNAME: "INVALID_USERNAME",
    EMAIL_EXISTS: "EMAIL_EXISTS",
    FILE_UPLOAD_ERROR: "FILE_UPLOAD_ERROR",


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