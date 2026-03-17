const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");

const createOrder = async (userId, products, totalAmount) => {
  if (!products || products.length === 0) {
    throw new Error("Order must contain at least one product");
  }

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    if (item.quantity > product.countInStock) {
      throw new Error(`Not enough stock for product ${product.name}`);
    }
  }

  const order = new Order({
    userId,
    products,
    totalAmount,
  });

  return await order.save();
};

const getAllOrders = async () => {
  return await Order.find()
    .populate("userId", "name email")
    .populate("products.productId", "name price");
};

const getOrderById = async (id) => {
  return await Order.findById(id)
    .populate("userId", "name email")
    .populate("products.productId", "name price");
};

const updateOrderStatus = async (id, status) => {
  const validStatuses = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "canceled",
  ];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  return await Order.findByIdAndUpdate(id, { status }, { new: true });
};

const deleteOrder = async (id) => {
  return await Order.findByIdAndDelete(id);
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
};
