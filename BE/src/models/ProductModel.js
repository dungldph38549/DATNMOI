const mongoose = require("mongoose");

// ── Variant schema ─────────────────────────────────────────────
const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, "SKU của biến thể là bắt buộc"],
    uppercase: true,
    trim: true,
    unique: true,
    index: true,
  },
  price: {
    type: Number,
    required: [true, "Giá biến thể là bắt buộc"],
    min: [0, "Giá biến thể không được âm"],
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, "Số lượng không được âm"],
  },
  sold: {
    type: Number,
    default: 0,
    min: 0,
  },
  attributes: {
    // { Size: "42", Color: "Đen" }
    type: Map,
    of: String,
    required: [true, "Thuộc tính của biến thể là bắt buộc"],
  },
  images: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
});

// ── Product schema ─────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    // ── Thông tin cơ bản ────────────────────────────────────
    name: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Mô tả chi tiết là bắt buộc"],
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxLength: [500, "Mô tả ngắn không được vượt quá 500 ký tự"],
    },

    // ── Danh mục & thương hiệu ───────────────────────────────
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Thương hiệu là bắt buộc"],
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Danh mục là bắt buộc"],
      index: true,
    },

    // ── Ảnh ─────────────────────────────────────────────────
    image: {
      type: String,
      required: [true, "Ảnh chính của sản phẩm là bắt buộc"],
      trim: true,
    },
    // Ảnh phụ — controller dùng tên "srcImages"
    srcImages: [{ type: String, trim: true }],

    // ── Giá & tồn kho (cho sản phẩm không có biến thể) ──────
    price: {
      type: Number,
      required: function () {
        return !this.hasVariants;
      },
      min: [0, "Giá sản phẩm không được âm"],
    },
    // countInStock alias → stock (controller comment dùng countInStock, model dùng stock)
    stock: {
      type: Number,
      required: function () {
        return !this.hasVariants;
      },
      min: [0, "Số lượng tồn kho không được âm"],
      default: 0,
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Controller sort theo "soldCount" — giữ alias để query không lỗi
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Biến thể ─────────────────────────────────────────────
    hasVariants: { type: Boolean, default: false },
    attributes: [{ type: String, trim: true }], // ["Size", "Color"]
    variants: [variantSchema],

    // ── Phân loại sản phẩm (controller filter) ───────────────
    // Controller dùng: gender, style — phải có trong model
    gender: {
      type: String,
      enum: ["nam", "nữ", "unisex", "trẻ em"],
      default: "unisex",
      index: true,
    },
    style: {
      // running | lifestyle | basketball | football | training | ...
      type: String,
      trim: true,
      index: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    // ── Trạng thái ───────────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "discontinued"],
      default: "active",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },

    // Controller dùng "isVisible" (toggleVisible) — cần field này
    isVisible: { type: Boolean, default: true, index: true },

    isFeatured: { type: Boolean, default: false, index: true },

    // Soft delete — controller dùng cả "isDeleted" và "deletedAt"
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // ── SEO ──────────────────────────────────────────────────
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Compound indexes ───────────────────────────────────────────
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ brandId: 1, categoryId: 1 });
productSchema.index({ status: 1, isActive: 1, isDeleted: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ sold: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ rating: -1 });
productSchema.index({ price: 1 });

// ── Virtuals ───────────────────────────────────────────────────
productSchema.virtual("totalStock").get(function () {
  if (this.hasVariants)
    return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  return this.stock || 0;
});

productSchema.virtual("isLowStock").get(function () {
  if (this.hasVariants)
    return this.variants.some((v) => v.isActive && v.stock <= 10);
  return this.stock <= 10;
});

productSchema.virtual("isOutOfStock").get(function () {
  if (this.hasVariants)
    return this.variants.every((v) => !v.isActive || v.stock === 0);
  return this.stock === 0;
});

productSchema.virtual("priceRange").get(function () {
  if (this.hasVariants && this.variants.length > 0) {
    const prices = this.variants.filter((v) => v.isActive).map((v) => v.price);
    if (!prices.length) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  return { min: this.price, max: this.price };
});

// ── Pre-save: tạo slug từ tên ──────────────────────────────────
productSchema.pre("save", function (next) {
  if (this.isModified("name") || this.isNew) {
    const base = this.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    this.slug = this.isNew ? `${base}-${Date.now()}` : base;
  }
  next();
});

// ── Pre-validate: kiểm tra biến thể ───────────────────────────
productSchema.pre("validate", function (next) {
  if (!this.hasVariants) {
    if (!this.price || this.price <= 0)
      return next(new Error("Sản phẩm không có biến thể phải có giá > 0."));
    if (this.stock < 0)
      return next(new Error("Số lượng tồn kho không được âm."));
    return next();
  }

  if (!this.variants?.length)
    return next(new Error("Sản phẩm có biến thể phải có ít nhất 1 biến thể."));

  const expectedAttrs = this.attributes || [];

  for (const v of this.variants) {
    // Giá
    if (!v.price || v.price <= 0)
      return next(new Error("Tất cả biến thể phải có giá > 0."));

    // Thuộc tính
    const keys = v.attributes ? Array.from(v.attributes.keys()) : [];
    if (
      keys.length !== expectedAttrs.length ||
      !expectedAttrs.every((k) => keys.includes(k))
    )
      return next(
        new Error(
          `Biến thể phải có đầy đủ thuộc tính: [${expectedAttrs.join(", ")}]`,
        ),
      );

    // Giá trị rỗng
    if (Array.from(v.attributes.values()).some((val) => !val?.trim()))
      return next(
        new Error("Không được để giá trị thuộc tính biến thể trống."),
      );
  }

  // SKU trùng trong cùng sản phẩm
  const skus = this.variants.map((v) => v.sku);
  const dup = skus.find((s, i) => skus.indexOf(s) !== i);
  if (dup) return next(new Error(`SKU "${dup}" bị trùng trong cùng sản phẩm.`));

  next();
});

// ── Static helpers ─────────────────────────────────────────────
productSchema.statics.findLowStock = function () {
  return this.find({
    isDeleted: { $ne: true },
    isActive: true,
    $or: [
      { hasVariants: false, $expr: { $lte: ["$stock", 10] } },
      {
        hasVariants: true,
        variants: {
          $elemMatch: { isActive: true, $expr: { $lte: ["$stock", 10] } },
        },
      },
    ],
  });
};

productSchema.statics.findOutOfStock = function () {
  return this.find({
    isDeleted: { $ne: true },
    isActive: true,
    $or: [
      { hasVariants: false, stock: 0 },
      {
        hasVariants: true,
        variants: {
          $not: { $elemMatch: { isActive: true, stock: { $gt: 0 } } },
        },
      },
    ],
  });
};

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
