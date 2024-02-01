import mongoose from "mongoose";
const PurchaseSchema = mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
});
const UserSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phoneno: {
    type: Number,
    required: true,
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
  purchases: [PurchaseSchema],
});

export const User = mongoose.model("User", UserSchema);
