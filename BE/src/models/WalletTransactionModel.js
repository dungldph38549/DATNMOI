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
        "order_line_cancel_refund",
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
// Chỉ giới hạn 1 giao dịch / đơn với order_payment & order_cancel_refund.
// order_line_cancel_refund có thể nhiều bản ghi cho cùng đơn.
walletTransactionSchema.index(
  { orderId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      orderId: { $type: "objectId" },
      type: { $in: ["order_payment", "order_cancel_refund"] },
    },
  },
);
// Unique chỉ khi có topUpId (nạp ví). Sparse unique vẫn index nhiều doc topUpId: null → E11000.
walletTransactionSchema.index(
  { topUpId: 1 },
  {
    unique: true,
    partialFilterExpression: { topUpId: { $type: "objectId" } },
  },
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
