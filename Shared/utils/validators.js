export function validateBearerJWT( value ) {
    // check if authorization header has a valid Bearer token format
    if ( !/^Bearer\s.+$/.test( value ) ) {
        return false
    }

    return true
}