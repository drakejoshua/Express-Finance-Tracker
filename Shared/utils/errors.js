const ERROR_CODES = {
    INVALID_ROUTE: "INVALID_ROUTE",
    DATABASE_CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR",
}

// not found error for invalid routes
const NotFoundError = new Error("The requested resource was not found on this server.")
NotFoundError.status = 404
NotFoundError.code = ERROR_CODES.INVALID_ROUTE

export function reportNotFoundError( next ) {
    return next( NotFoundError )
}


// database connection error for when database connection fails
const DatabaseConnectionError = new Error("Failed to connect to the database.")
DatabaseConnectionError.status = 500
DatabaseConnectionError.code = ERROR_CODES.DATABASE_CONNECTION_ERROR

export function reportDatabaseConnectionError( next ) {
    return next( DatabaseConnectionError )
}