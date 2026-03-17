const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    guestId: {
      type: String,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cod", "vnpay"],
    },
    shippingMethod: {
      type: String,
      required: true,
      enum: ["standard", "fast"],
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        sku: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        attributes: {
          type: Object,
          default: {},
        },
      },
    ],
    discount: {
      type: Number,
      default: 0,
    },
    voucherCode: {
      type: String,
      default: null,
    },
    shippingFee: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "canceled",
        "return-request",
        "accepted",
        "rejected",
      ],
      default: "pending",
    },
  },
  { timestamps: true },
);

// Đảm bảo ít nhất 1 trong 2: userId hoặc guestId
orderSchema.pre("validate", function (next) {
  if (!this.userId && !this.guestId) {
    this.invalidate("userId", "Either userId or guestId is required.");
    this.invalidate("guestId", "Either guestId or userId is required.");
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
