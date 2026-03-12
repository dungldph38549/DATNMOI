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
    phone: {
      type: String, // Changed to String as phone numbers can have leading zeros
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/missing values to be ignored in unique index
    },
    avatar: {
      type: String,
    },
    refresh_token: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
