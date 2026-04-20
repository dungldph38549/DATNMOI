const mongoose = require("mongoose");

const orderStatusHistorySchema = new mongoose.Schema(
  {
    oldStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "received",
        "canceled",
        "return-request",
        "accepted",
        "rejected",
      ],
    },
    newStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "received",
        "canceled",
        "return-request",
        "accepted",
        "rejected",
      ],
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    image: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
    },
    reasonCode: {
      type: String,
      default: "",
      trim: true,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OrderStatusHistory", orderStatusHistorySchema);
