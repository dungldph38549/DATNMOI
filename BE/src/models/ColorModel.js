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
        /** Ví dụ: rgb(255, 0, 0) — bổ sung cho hiển thị / tham chiếu */
        rgb: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const Color = mongoose.model("Color", colorSchema);

module.exports = Color;
