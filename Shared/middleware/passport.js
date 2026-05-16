import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import Users from "../../Database/Schema/UserSchema.js"
import bcrypt from "bcrypt"
import { 
    EmailNotFoundError, 
    InvalidEmailAuthenticationMethodError, 
    InvalidAuthorizationTokenError, 
    InvalidPasswordError, 
    InvalidGoogleAuthenticationMethodError
} from "../utils/errors.js"

export function configurePassport( passport ) {
    // configure local strategy for passport authentication
    passport.use( new LocalStrategy(
        // set the fields to be used for username for authentication
        // from the request body
        {
            usernameField: 'email', // use 'email' field as username
        },
        // verify callback to authenticate user using the provided email and password
        async function( email, password, done ) {
            try {
                // find user by email
                const user = await Users.findOne( { email: email } );

                // if user not found, report email not found error
                if ( !user ) {
                    return done( EmailNotFoundError, false );
                }

                // check if the user found uses email-password authentication method
                if ( user.provider !== "local" ) {
                    return done( InvalidEmailAuthenticationMethodError, false );
                }

                // if user is found, compare the provided password with the hashed password in the database
                const isMatch = await bcrypt.compare( password, user.password );

                // if password does not match, report invalid password error
                if ( !isMatch ) {
                    return done( InvalidPasswordError, false );
                }

                // if authentication is successful, return the user object
                return done( null, user );
            } catch( error ) {
                return done( error, false );
            }
        }
    ))

    // configure JWT strategy for passport authentication
    passport.use( new JwtStrategy(
        // set the options for JWT strategy, including how to extract the
        // JWT from the request and the secret key to verify the token
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET_KEY
        },
        // verify callback to authenticate user using the information 
        // in the JWT payload
        async function( jwt_payload, done ) {
            try {
                // find user by ID from the JWT payload
                const user = await Users.findById( jwt_payload.userId )

                // if user not found, report email not found error
                if ( !user ) {
                    return done( InvalidAuthorizationTokenError, false )
                }

                // if user is found, return the user object
                return done( null, user )
            } catch ( error ) {
                console.log( "Error in JWT strategy:", error )
                return done( error, false )
            }
        }
    ))

    // configure google OAuth strategy for passport authentication
    passport.use( new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_REDIRECT_URI
        },
        async function( accessToken, refreshToken, profile, done ) {
            try {
                // find user by Google ID from the profile information
                let user = await Users.findOne( { email: profile.emails[0].value } )
                
                // if user not found, create a new user with the information from the Google profile
                if ( !user ) {
                    const newUser = await Users.signUp({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        provider: "google",
                        profile_photo: profile.photos[0].value
                    })

                    // return the newly created user object back to passport
                    return done( null, newUser )
                }

                // if all checks pass, return the user object
                return done( null, user )
            } catch ( error ) {
                return done( error, false )
            }
        }
    ))
}