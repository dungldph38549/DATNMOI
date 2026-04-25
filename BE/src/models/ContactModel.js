const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "archived"],
      default: "new",
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Contact", contactSchema);
