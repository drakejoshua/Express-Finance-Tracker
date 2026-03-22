// error-handling middleware function for the server

export function error( error, req, res, next ) {
    // check if the error has a status property and use it as the response status code,
    // otherwise default to 500 for server errors
    if ( error.status ) {
        res.status( error.status ).json({
            status: "error",
            error: {
                message: error.message,
                code: error.code
            }
        })
    } else {
        // if the error doesn't have a status property, log the error and send a generic 500 response
        console.error( error )

        // send a generic error response with status 500 and include the error message and code if available
        res.status( 500 ).json({
            status: "error",
            error: {
                message: `A fatal error occurred on the server: ${ error.message }` || "A fatal error occurred on the server.",
                code: error.code || "SERVER_ERROR"
            }
        })
    }
}
