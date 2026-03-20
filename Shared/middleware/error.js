export function error( error, req, res, next ) {
    if ( error.status ) {
        res.status( error.status ).json({
            error: {
                message: error.message,
                code: error.code
            }
        })
    } else {
        console.error( error )
        res.status( 500 ).json({
            error: {
                message: `A fatal error occurred on the server: ${ error.message }` || "A fatal error occurred on the server.",
                code: error.code || "SERVER_ERROR"
            }
        })
    }
}
