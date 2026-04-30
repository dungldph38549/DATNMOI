const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // SKU của biến thể (nếu product có variants). Dùng để reserve tồn kho theo SKU.
    sku: {
      type: String,
      default: null,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Size hiển thị (tuỳ chọn, để UI/đơn hàng dễ hiểu hơn)
    size: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    colorHex: {
      type: String,
      default: null,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  },
);

cartSchema.virtual("itemsCount").get(function () {
  return this.items.reduce((sum, item) => sum + (item.qty || 0), 0);
});

cartSchema.virtual("subtotal").get(function () {
  return this.items.reduce(
    (sum, item) => sum + (item.qty || 0) * (item.price || 0),
    0,
  );
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;

