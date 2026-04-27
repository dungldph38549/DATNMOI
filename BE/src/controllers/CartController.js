const mongoose = require("mongoose");
const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ensureCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// GET /api/cart/:userId
const getCart = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "userId không hợp lệ" });
    }

    const cart = await ensureCart(userId);

    return res.status(200).json({
      status: "OK",
      data: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        itemsCount: cart.itemsCount,
        subtotal: cart.subtotal,
      },
    });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(500).json({
      status: "ERR",
      message: err?.message || "Internal server error",
    });
  }
};

// POST /api/cart/:userId/items  { productId, qty }
const addItem = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { productId, qty, sku, size, color } = req.body || {};

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "userId không hợp lệ" });
    }

    if (!isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "productId không hợp lệ" });
    }

    const quantity = Number(qty || 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        status: "ERR",
        message: "Số lượng phải là số nguyên dương",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ status: "ERR", message: "Sản phẩm không tồn tại" });
    }

    // Nếu có SKU (product có variants) thì kiểm tra tồn kho theo biến thể.
    let availableStock = 0;
    let variantPrice = product.price;
    let variantSize = size ?? null;
    let variantColor =
      color != null && String(color).trim() !== ""
        ? String(color).trim()
        : null;

    const pickColorFromAttrs = (attrs) => {
      if (!attrs) return null;
      const fromGet =
        attrs.get?.("Color") ??
        attrs.get?.("color") ??
        attrs.get?.("Màu") ??
        attrs.get?.("Mau");
      if (fromGet != null && String(fromGet).trim() !== "")
        return String(fromGet).trim();
      if (typeof attrs === "object" && !attrs.get) {
        const key = Object.keys(attrs).find((k) => {
          const lk = String(k).toLowerCase();
          return lk === "color" || lk === "màu" || lk === "mau";
        });
        const v = key ? attrs[key] : null;
        if (v != null && String(v).trim() !== "") return String(v).trim();
      }
      return null;
    };

    if (sku && product?.hasVariants) {
      const variant = product.variants.find((v) => v.sku === sku);
      if (!variant) {
        return res.status(400).json({
          status: "ERR",
          message: `Không tìm thấy biến thể SKU ${sku}`,
        });
      }
      availableStock = variant.stock ?? 0;
      variantPrice = variant.price ?? product.price;
      // Map attributes trong Mongoose có thể là Map hoặc object tuỳ trường hợp
      const maybeGet = variant?.attributes?.get?.("Size");
      variantSize = size ?? maybeGet ?? variant?.attributes?.Size ?? null;
      const fromVariant = pickColorFromAttrs(variant?.attributes);
      variantColor = variantColor ?? fromVariant ?? null;
    } else {
      // Không có SKU → lấy tồn kho tổng sản phẩm
      availableStock = product.stock ?? product.countInStock ?? product?.totalStock ?? 0;
      // Nếu product có variants mà chưa gửi SKU, vẫn cố gắng lấy tồn kho tổng để tránh lỗi.
      if (availableStock === 0 && product?.hasVariants && Array.isArray(product.variants)) {
        availableStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
        if (!variantPrice && product.variants[0]) variantPrice = product.variants[0].price ?? product.price;
        if (!variantSize && product.variants[0]?.attributes) {
          const firstSize = product.variants[0]?.attributes?.get?.("Size");
          variantSize = firstSize ?? product.variants[0]?.attributes?.Size ?? null;
        }
      }
    }

    if (availableStock < quantity) {
      return res.status(400).json({
        status: "ERR",
        message: "Số lượng vượt quá tồn kho",
      });
    }

    const cart = await ensureCart(userId);

    const existing = cart.items.find(
      (item) => String(item.product) === String(productId),
    );

    if (existing) {
      const newQty = existing.qty + quantity;
      // Nếu thêm cùng sản phẩm nhưng SKU thay đổi → cập nhật SKU/size/price cho đúng biến thể.
      if (sku && existing.sku !== sku) {
        existing.sku = sku;
        existing.size = variantSize;
        existing.color = variantColor;
        existing.price = variantPrice ?? existing.price;
      } else if (sku && existing.sku === sku && variantColor != null) {
        existing.color = variantColor;
      }

      // Tính lại availableStock theo SKU hiện tại nếu có.
      const currentSku = sku ?? existing.sku;
      let currentAvailableStock = availableStock;
      if (currentSku && product?.hasVariants) {
        const variant = product.variants.find((v) => v.sku === currentSku);
        currentAvailableStock = variant?.stock ?? 0;
      }

      if (newQty > currentAvailableStock) {
        return res.status(400).json({
          status: "ERR",
          message: "Tổng số lượng trong giỏ vượt quá tồn kho",
        });
      }
      existing.qty = newQty;
    } else {
      cart.items.push({
        product: product._id,
        sku: product?.hasVariants ? sku ?? null : null,
        size: product?.hasVariants ? variantSize : null,
        color: product?.hasVariants ? variantColor : null,
        name: product.name,
        image: product.image,
        price: product?.hasVariants ? variantPrice ?? product.price : product.price,
        qty: quantity,
      });
    }

    await cart.save();

    return res.status(200).json({
      status: "OK",
      message: "Đã cập nhật giỏ hàng",
      data: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        itemsCount: cart.itemsCount,
        subtotal: cart.subtotal,
      },
    });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(500).json({
      status: "ERR",
      message: err?.message || "Internal server error",
    });
  }
};

// PUT /api/cart/:userId/items/:productId  { qty }
const updateItemQty = async (req, res, next) => {
  try {
    const { userId, productId } = req.params;
    const { qty } = req.body || {};

    if (!isValidObjectId(userId) || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "userId hoặc productId không hợp lệ" });
    }

    const quantity = Number(qty);
    if (!Number.isInteger(quantity)) {
      return res.status(400).json({
        status: "ERR",
        message: "Số lượng phải là số nguyên",
      });
    }

    const cart = await ensureCart(userId);
    const item = cart.items.find(
      (i) => String(i.product) === String(productId),
    );

    if (!item) {
      return res.status(404).json({
        status: "ERR",
        message: "Sản phẩm không có trong giỏ",
      });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (i) => String(i.product) !== String(productId),
      );
    } else {
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ status: "ERR", message: "Sản phẩm không tồn tại" });
      }

      // Nếu item có SKU (variant) thì kiểm tra theo SKU.
      let availableStock = product.stock ?? product.countInStock ?? product?.totalStock ?? 0;
      if (item?.sku && product?.hasVariants) {
        const variant = product.variants.find((v) => v.sku === item.sku);
        availableStock = variant?.stock ?? 0;
      }
      // Fallback: nếu product có variants nhưng không có sku hợp lệ → lấy tổng tồn kho.
      if (availableStock === 0 && product?.hasVariants && Array.isArray(product.variants)) {
        availableStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
      }

      if (quantity > availableStock) {
        return res.status(400).json({
          status: "ERR",
          message: "Số lượng vượt quá tồn kho",
        });
      }

      item.qty = quantity;
    }

    await cart.save();

    return res.status(200).json({
      status: "OK",
      message: "Đã cập nhật giỏ hàng",
      data: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        itemsCount: cart.itemsCount,
        subtotal: cart.subtotal,
      },
    });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(500).json({
      status: "ERR",
      message: err?.message || "Internal server error",
    });
  }
};

// DELETE /api/cart/:userId/items/:productId
const removeItem = async (req, res, next) => {
  try {
    const { userId, productId } = req.params;

    if (!isValidObjectId(userId) || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "userId hoặc productId không hợp lệ" });
    }

    const cart = await ensureCart(userId);
    const before = cart.items.length;
    cart.items = cart.items.filter(
      (i) => String(i.product) !== String(productId),
    );

    if (cart.items.length === before) {
      return res.status(404).json({
        status: "ERR",
        message: "Sản phẩm không có trong giỏ",
      });
    }

    await cart.save();

    return res.status(200).json({
      status: "OK",
      message: "Đã xóa sản phẩm khỏi giỏ",
      data: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        itemsCount: cart.itemsCount,
        subtotal: cart.subtotal,
      },
    });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(500).json({
      status: "ERR",
      message: err?.message || "Internal server error",
    });
  }
};

// DELETE /api/cart/:userId
const clearCart = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "userId không hợp lệ" });
    }

    const cart = await ensureCart(userId);
    cart.items = [];
    await cart.save();

    return res.status(200).json({
      status: "OK",
      message: "Đã xóa toàn bộ giỏ hàng",
      data: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        itemsCount: cart.itemsCount,
        subtotal: cart.subtotal,
      },
    });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(500).json({
      status: "ERR",
      message: err?.message || "Internal server error",
    });
  }
};

module.exports = {
  getCart,
  addItem,
  updateItemQty,
  removeItem,
  clearCart,
};

