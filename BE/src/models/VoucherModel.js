const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      default: "percent",
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    usageLimit: {
      type: Number,
      default: 0, // 0 = unlimited
      min: 0,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // Danh sách sản phẩm áp dụng voucher. Rỗng = áp dụng toàn bộ sản phẩm.
    applicableProductIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Voucher = mongoose.model("Voucher", voucherSchema);

module.exports = Voucher;

