import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
    {
        email : {
            type : String,
            required : true,
        },
        username: {
            type : String,
            required : true
        },
        password: {
            type : String,
            required : true,
        },
        phoneno: {
            type : Number,
            required : true,
        },
        isPaymentVerified: {
            type: Boolean,
            default: false, // Default value is false
        },
        userType: {
            type: String,
            enum: ["seller", "buyer", null], // 'seller', 'buyer', or null (default)
            default: null, // Default value is null
        },
    }
);

export const User = mongoose.model('User', UserSchema);
