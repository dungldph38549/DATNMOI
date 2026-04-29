const mongoose = require("mongoose");
const crypto = require("crypto");

const walletTopUpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [10000, "Số tiền tối thiểu 10.000đ"],
    },
    method: {
      type: String,
      enum: ["vnpay", "bank_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_transfer",
        "awaiting_admin",
        "completed",
        "failed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
      index: true,
    },
    /** Nội dung chuyển khoản (duy nhất) — chỉ bank_transfer */
    referenceCode: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    userMarkedSentAt: { type: Date, default: null },
    adminNote: { type: String, trim: true, default: "" },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

walletTopUpSchema.statics.generateReferenceCode = function generateReferenceCode(
  _userId,
) {
  // Mã chuyển khoản random để khó đoán và tránh trùng.
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `NAP${random}`;
};

walletTopUpSchema.pre("validate", function autoReferenceCode() {
  if (this.method === "bank_transfer" && !String(this.referenceCode || "").trim()) {
    this.referenceCode = this.constructor.generateReferenceCode(this.userId);
  }
});

module.exports = mongoose.model("WalletTopUp", walletTopUpSchema);
