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
      required: true,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    phone: {
      type: String,        // 🔥 đổi Number -> String
      required: true,
    },

    access_token: {
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