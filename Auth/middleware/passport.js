import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import Users from "../../Database/Schema/UserSchema.js"
import bcrypt from "bcrypt"
import { EmailNotFoundError, InvalidAuthenticationMethodError, InvalidPasswordError } from "../../Shared/utils/errors.js"

export function configurePassport( passport ) {
    // configure the local strategy for passport authentication
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
                    return done( InvalidAuthenticationMethodError, false );
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
}