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
      enum: ["cod", "vnpay", "wallet"],
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
        basePrice: {
          type: Number,
          default: 0,
        },
        lineDiscount: {
          type: Number,
          default: 0,
        },
        appliedSaleRuleId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        appliedSaleName: {
          type: String,
          default: null,
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
        "received",
        "canceled",
        "return-request",
        "accepted",
        "rejected",
      ],
      default: "pending",
    },
    /** Lý do và ảnh khách gửi khi tạo yêu cầu hoàn hàng */
    returnRequestReason: {
      type: String,
      default: "",
      trim: true,
    },
    returnRequestReasonCode: {
      type: String,
      default: "",
      trim: true,
    },
    returnRequestImages: {
      type: [String],
      default: [],
    },
    /** Giao dịch hoàn tiền vào ví (sau khi admin chấp nhận hoàn hàng) */
    walletRefundTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    walletRefundAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    walletRefundedAt: {
      type: Date,
      default: null,
    },
    /** Ghi có trừ ví khi đặt hàng (paymentMethod = wallet) */
    walletPaymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    /** Hoàn ví khi hủy đơn đã trừ ví */
    walletCancelRefundTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
  },
  { timestamps: true },
);

// Đảm bảo ít nhất 1 trong 2: userId hoặc guestId
orderSchema.pre("validate", function () {
  // Use sync middleware style to avoid `next is not a function` runtime errors.
  if (!this.userId && !this.guestId) {
    this.invalidate("userId", "Either userId or guestId is required.");
    this.invalidate("guestId", "Either guestId or userId is required.");
  }
});

module.exports = mongoose.model("Order", orderSchema);
