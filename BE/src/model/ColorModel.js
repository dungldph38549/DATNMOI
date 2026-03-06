const mongoose = require("mongoose");

const colorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const Color = mongoose.model("Color", colorSchema);

module.exports = Color;
