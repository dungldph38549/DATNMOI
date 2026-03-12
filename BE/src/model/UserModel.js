const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password only required if not Google login
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    phone: { // Changed to String as phone numbers can have leading zeros
      type: String,        // 🔥 đổi Number -> String
      required: true,

    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/missing values to be ignored in unique index
    },
    avatar: {
      type: String,
      default: null,       // 🔥 bỏ required

    },
    refresh_token: {
      type: String,
      default: null,       // 🔥 bỏ required

    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);