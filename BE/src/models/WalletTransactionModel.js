const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    topUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTopUp",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "return_refund",
        "order_payment",
        "order_cancel_refund",
        "topup_vnpay",
        "topup_bank",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index(
  { orderId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      orderId: { $exists: true, $ne: null },
    },
  },
);
walletTransactionSchema.index(
  { topUpId: 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
