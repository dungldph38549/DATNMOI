const mongoose = require("mongoose");
const Cart = require("../model/CartModel");
const Product = require("../model/ProductModel");

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
    next(err);
  }
};

// POST /api/cart/:userId/items  { productId, qty }
const addItem = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { productId, qty } = req.body || {};

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

    const availableStock = product.stock ?? product.countInStock ?? 0;
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
      if (newQty > availableStock) {
        return res.status(400).json({
          status: "ERR",
          message: "Tổng số lượng trong giỏ vượt quá tồn kho",
        });
      }
      existing.qty = newQty;
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
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
    next(err);
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

      const availableStock = product.stock ?? product.countInStock ?? 0;
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
    next(err);
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
    next(err);
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
    next(err);
  }
};

module.exports = {
  getCart,
  addItem,
  updateItemQty,
  removeItem,
  clearCart,
};

