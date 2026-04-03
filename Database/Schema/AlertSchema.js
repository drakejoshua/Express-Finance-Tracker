// import mongoose to define the Alert schema and model
import mongoose from "mongoose";

// define the Alert schema with fields for user reference, 
// condition, target price, asset symbol, active status, title, 
// and message
const alertSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Users",
        required: true
    },
    condition: {
        type: String,
        enum: ["above", "below"],
        required: true
    },
    target_price: {
        type: Number,
        required: true,
        min: 0
    }, 
    asset_symbol: {
        type: String,
        required: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    title: {
        type: String,
        required: true,
        maxLength: 100
    },
    message: {
        type: String,
        required: true,
        maxLength: 500
    }
})


// Alert management methods to be added to the Alert schema for creating,
// updating, deleting and deactivating alerts
alertSchema.statics.createAlert = async function( alertData ) {
    const alert = new this({
        user_id: alertData.user_id,
        condition: alertData.condition,
        target_price: alertData.target_price,
        asset_symbol: alertData.asset_symbol,
        title: alertData.title,
        message: alertData.message
    })

    return alert.save()
}


// export the Alert model for use in other parts of the application
export default mongoose.model("Alerts", alertSchema)