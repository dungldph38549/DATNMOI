const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const Size = mongoose.model("Size", sizeSchema);

module.exports = Size;
