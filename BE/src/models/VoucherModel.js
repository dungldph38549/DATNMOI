const mongoose = require("mongoose");

const usedBySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    guestId: {
      type: String,
      default: null,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /** percent | fixed */
    type: {
      type: String,
      enum: ["percent", "fixed"],
      default: "percent",
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** 0 = không giới hạn tổng lượt */
    usageLimit: {
      type: Number,
      default: 1,
      min: 0,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** 0 = không giới hạn mỗi user */
    userLimit: {
      type: Number,
      default: 1,
      min: 0,
    },

    usedBy: {
      type: [usedBySchema],
      default: [],
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /** Soft delete */
    isDeleted: {
      type: Boolean,
      default: false,
    },

    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // --- Legacy (tài liệu cũ trong MongoDB) ---
    discountType: { type: String, enum: ["percent", "fixed"] },
    discountValue: { type: Number },
    maxDiscountAmount: { type: Number, min: 0 },
    status: { type: String, enum: ["active", "inactive"] },
    applicableProductIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
  },
  {
    timestamps: true,
  },
);

voucherSchema.pre("validate", function (next) {
  try {
    if (!this.type && this.discountType) {
      this.type = this.discountType;
    }
    if (this.value == null && this.discountValue != null) {
      this.value = this.discountValue;
    }
    if (
      (this.maxDiscount == null || this.maxDiscount === undefined) &&
      this.maxDiscountAmount != null
    ) {
      this.maxDiscount = this.maxDiscountAmount;
    }
    if (this.isActive == null && this.status != null) {
      this.isActive = this.status === "active";
    }
    if (
      (!this.applicableProducts || this.applicableProducts.length === 0) &&
      Array.isArray(this.applicableProductIds) &&
      this.applicableProductIds.length > 0
    ) {
      this.applicableProducts = [...this.applicableProductIds];
    }

    const t = this.type || "percent";
    if (t === "percent") {
      const v = Number(this.value);
      if (v < 1 || v > 100) {
        throw new Error("Giá trị % phải từ 1 đến 100");
      }
    }

    const start = this.startDate ? new Date(this.startDate) : null;
    const end = this.endDate ? new Date(this.endDate) : null;
    if (start && end && end < start) {
      throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
    }

    next();
  } catch (err) {
    next(err);
  }
});

voucherSchema.pre("save", function () {
  if (this.code) {
    this.code = String(this.code).trim().toUpperCase();
  }
  return Promise.resolve();
});

voucherSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

const Voucher = mongoose.model("Voucher", voucherSchema);

module.exports = Voucher;
