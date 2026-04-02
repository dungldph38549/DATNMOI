const mongoose = require("mongoose");

const shoelaceSizeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const ShoelaceSize = mongoose.model("ShoelaceSize", shoelaceSizeSchema);

module.exports = ShoelaceSize;
