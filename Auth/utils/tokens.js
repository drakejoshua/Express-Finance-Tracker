import jsonwebtoken from "jsonwebtoken"

// retrieve JWT secret key and token expiration times from environment
// variables
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY
const JWT_ACCESS_TOKEN_EXPIRATION = process.env.JWT_ACCESS_TOKEN_EXPIRATION
const JWT_REFRESH_TOKEN_EXPIRATION = process.env.JWT_REFRESH_TOKEN_EXPIRATION

// generateAccessToken() - generates a JWT access token for a given user 
// ID with a specified expiration time
export function generateAccessToken( userId ) {
    return jsonwebtoken.sign(
        { userId },
        JWT_SECRET_KEY,
        { 
            expiresIn: `${ JWT_ACCESS_TOKEN_EXPIRATION }` 
        }
    )
}

// generateRefreshToken() - generates a JWT refresh token for a given user
// ID with a specified expiration time
export function generateRefreshToken( userId ) {
    return jsonwebtoken.sign(
        { userId },
        JWT_SECRET_KEY,
        { 
            expiresIn: `${ JWT_REFRESH_TOKEN_EXPIRATION }` 
        } 
    )
}

// verifyJWT() - verifies a given JWT token and returns the decoded payload
// as an object if the token is valid, or throws an error if the token is invalid
export function verifyJWT( token ) {
    return jsonwebtoken.verify(
        token,
        JWT_SECRET_KEY
    )
}