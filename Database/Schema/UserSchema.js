import mongoose from "mongoose";
import { supportedCurrencies } from "../utils/supportedCurrencies.js";

// User schema to represent user data in the database with validation rules and default values
const UserSchema = mongoose.Schema({
    name: {         // validation rules for name field: required, min length of 3 characters
        type: String,
        required: true,
        minLength: 3
    },
    email: {        // validation rules for email field: required, unique, and must match email regex pattern
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function( value ) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test( value )
            },
            message: props => `${ props.value } is not a valid email address`
        }
    },
    password: {        // validation rules for password field: required and min length of 6 characters
        type: String,
        required: true,
        minLength: 6
    },
    profile_photo: String,
    profile_photo_public_id: String,
    currency: {         // validation rules for currency field: must be one of the supported currencies and defaults to USD
        type: String,
        enum: supportedCurrencies,
        default: "USD"
    },
    portfolio: [ AssetSchema ],
    watchlist: [ String ],
    email_verified: {       // validation rules for email_verified field: boolean that defaults to false
        type: Boolean,
        default: false
    },
    email_verification_token: String,
    email_verification_expires: Date,
    password_reset_token: String,
    password_reset_expires: Date
})

// Asset schema to represent individual assets in the user's portfolio
const AssetSchema = mongoose.Schema({
    symbol: String,
    units: Number
})


UserSchema.methods.getProfileData = function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        profile_photo: this.profile_photo,
        preferred_currency: this.currency,
        portfolio: this.portfolio,
        watchlist: this.watchlist
    }
}

export default mongoose.model( "Users", UserSchema )