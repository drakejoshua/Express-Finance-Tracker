import mongoose from "mongoose";

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
    },
    alert_email: {
        type: String,
        required: true,
        lowercase: true,
        validate: {
            validator: function( value ) {
                // Simple email regex for validation
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: props => `${ props.value } is not a valid email address`
        }
    }
})


export default mongoose.model("Alerts", alertSchema)