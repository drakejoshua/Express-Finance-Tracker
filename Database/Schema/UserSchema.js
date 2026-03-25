import mongoose from "mongoose";
import { supportedCurrencies } from "../../Shared/utils/supportedCurrencies.js";

// Asset schema to represent individual assets in the user's portfolio
const AssetSchema = mongoose.Schema({
    symbol: {
        type: String,
        required: true
    },
    units: Number,
    provider: {
        type: String,
        enum: [ "fmp", "coingecko" ],
        required: true
    }
})

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
    provider: {
        type: String,
        enum: [ "local", "google" ],
        default: "local"
    },
    email_verification_token: String,
    email_verification_expires: Date,
    password_reset_token: String,
    password_reset_expires: Date,
    refresh_token: String
})

// document-based method to return the user's profile data as an object, 
// excluding sensitive information like password and refresh token
UserSchema.methods.getProfileData = function() {
    return {
        name: this.name,
        email: this.email,
        profile_photo: this.profile_photo,
        preferred_currency: this.currency,
        portfolio: this.portfolio,
        watchlist: this.watchlist
    }
}


// static method to create a new user in the database with the provided 
// sign-up data such as: name, email, password, optional profile photo URL and public ID
UserSchema.statics.signUp = async function( signUpData ) {
    const user = new this({
        name: signUpData.name,
        email: signUpData.email,
        password: signUpData?.password || "google_oauth_user",
        provider: signUpData?.provider || "local",
        profile_photo: signUpData?.profile_photo,
        profile_photo_public_id: signUpData?.profile_photo_public_id,
        email_verification_expires: signUpData?.email_verification_expires,
        email_verification_token: signUpData?.email_verification_token
    })

    await user.save()

    return user
}


UserSchema.methods.addAsset = async function( asset ) {
    // check if the asset already exists in the user's portfolio by matching 
    // the symbol and provider fields
    const existingAssetIndex = this.portfolio.findIndex( function ( item ) {
        return item.symbol === asset.symbol && item.provider === asset.provider
    })

    if ( existingAssetIndex !== -1 ) {
        // If the asset already exists, update its quantity
        this.portfolio[existingAssetIndex].units += asset.units
    } else {
        // If the asset doesn't exist, add it to the portfolio
        this.portfolio.push( asset )
    }

    return this.save()
}

UserSchema.methods.removeAsset = async function( symbol, provider ) {
    // filter the portfolio to remove the asset that matches the symbol and provider
    this.portfolio = this.portfolio.filter( function ( item ) {
        return !( item.symbol === symbol && item.provider === provider )
    })

    return this.save()
}

UserSchema.methods.updateAsset = async function( symbol, provider, newUnits ) {
    // find the index of the asset in the portfolio that matches the symbol and provider
    const assetIndex = this.portfolio.findIndex( function ( item ) {
        return item.symbol === symbol && item.provider === provider
    })

    if ( assetIndex !== -1 ) {
        // If the asset exists, update its quantity with the new value
        this.portfolio[assetIndex].units = newUnits
    } else {
        // if asset doesn't exist, add it to the portfolio with the provided symbol, provider and units
        this.portfolio.push({
            symbol: symbol,
            provider: provider,
            units: newUnits
        })
    }

    return this.save()
}

export default mongoose.model( "Users", UserSchema )