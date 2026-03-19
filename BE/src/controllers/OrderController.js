const { default: mongoose } = require("mongoose");
const Order = require("../models/OrderModel.js");
const Product = require("../models/ProductModel.js");
const Voucher = require("../models/VoucherModel.js");
const OrderStatusHistory = require("../models/orderStatusHistory.js");
const { successResponse, errorResponse } = require("../utils/response.js");
const User = require("../models/UserModel.js");
const inventoryService = require("../services/inventoryService");
const { VNPay } = require("vnpay");

const getVnpayClient = () =>
  new VNPay({
    tmnCode: process.env.VNP_TMN_CODE || "DEMOMERCHANT01",
    secureSecret: process.env.VNP_HASH_SECRET || "SECRETKEY",
    vnpayHost: process.env.VNP_URL || "https://sandbox.vnpayment.vn",
    testMode: true,
  });

// ================================================================
// Tạo đơn hàng
// ================================================================
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      userId,
      guestId,
      address,
      fullName,
      paymentMethod,
      shippingMethod,
      phone,
      email,
      products,
      discount = 0,
      totalAmount,
      voucherCode,
    } = req.body;

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }
    if (user?.isAdmin) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ message: "Quản trị viên không thể đặt hàng" });
    }

    if (!(userId || guestId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(422).json({ message: "Thiếu userId hoặc guestId" });
    }

    const requiredFields = {
      address,
      fullName,
      paymentMethod,
      shippingMethod,
      phone,
      email,
      totalAmount,
    };
    for (let key in requiredFields) {
      if (!requiredFields[key]) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(422)
          .json({ message: `Thiếu trường bắt buộc: ${key}` });
      }
    }

    if (!Array.isArray(products) || products.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(422)
        .json({ message: "Danh sách sản phẩm không hợp lệ" });
    }

    const shippingFee = shippingMethod === "fast" ? 30000 : 0;
    const mappedProducts = [];

    // Đầu tiên kiểm tra và chuẩn hóa dữ liệu sản phẩm
    for (const item of products) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ message: `Không tìm thấy sản phẩm: ${item.productId}` });
      }

      if (item.quantity <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Số lượng sản phẩm không hợp lệ" });
      }

      if (product.hasVariants) {
        const variant = product.variants.find((v) => v.sku === item.sku);
        if (!variant) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: `Không tìm thấy biến thể SKU ${item.sku} cho sản phẩm ${product.name}`,
          });
        }

        mappedProducts.push({
          productId: item.productId,
          sku: variant.sku,
          quantity: item.quantity,
          price: variant.price,
          attributes: Object.fromEntries(variant.attributes),
        });
      } else {
        mappedProducts.push({
          productId: item.productId,
          sku: null,
          quantity: item.quantity,
          price: product.price,
          attributes: {},
        });
      }
    }

    // Sau khi đã đảm bảo dữ liệu hợp lệ, tiến hành reserve tồn kho cho các SKU có Inventory
    for (const item of mappedProducts) {
      if (!item.sku) continue;
      try {
        await inventoryService.reserveBySku(
          item.sku,
          item.quantity,
          null,
          userId || guestId || null,
        );
      } catch (err) {
        // Fallback demo: nếu hệ thống Inventory chưa tạo record cho SKU này
        // thì trừ trực tiếp stock trên Product biến thể để vẫn cho đặt hàng.
        const msg = err?.message || "";
        const isSkuNotFound =
          err?.status === 404 || msg.includes(`SKU "${item.sku}"`) || msg.includes("SKU không tồn tại");

        if (!isSkuNotFound) throw err;

        const productForStock = await Product.findById(item.productId).session(session);
        if (!productForStock) {
          throw err;
        }

        const variant = productForStock.variants?.find((v) => v.sku === item.sku);
        const available = variant?.stock ?? 0;
        if (!variant || available < item.quantity) {
          throw new Error(`Không đủ hàng cho SKU ${item.sku} (khả dụng: ${available})`);
        }

        variant.stock = available - item.quantity;
        await productForStock.save({ session });
      }
    }

    const newOrder = new Order({
      userId,
      guestId,
      address,
      fullName,
      paymentMethod,
      shippingMethod,
      phone,
      email,
      products: mappedProducts,
      discount,
      voucherCode,
      shippingFee,
      totalAmount,
    });

    const savedOrder = await newOrder.save({ session });

    if (voucherCode) {
      await Voucher.findOneAndUpdate(
        { code: voucherCode },
        { $inc: { usedCount: 1 } },
        { session },
      );
    }

    await OrderStatusHistory.create(
      [{ newStatus: savedOrder.status, orderId: savedOrder._id }],
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    return res.status(201).json(savedOrder);
  } catch (err) {
    // Nếu tạo đơn thất bại, cố gắng giải phóng phần hàng đã reserve (nếu có)
    try {
      if (Array.isArray(req.body?.products)) {
        for (const item of req.body.products) {
          if (!item.sku || !item.quantity) continue;
          await inventoryService.releaseBySku(
            item.sku,
            item.quantity,
            null,
            req.body.userId || req.body.guestId || null,
          );
        }
      }
    } catch (_) {
      // bỏ qua lỗi release trong khối catch
    }
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Lấy đơn hàng theo user / guest
// ================================================================
exports.getOrdersByUserOrGuest = async (req, res) => {
  const { userId, guestId, page, limit } = req.query;
  const pageCurrent = parseInt(page) || 1;
  const limitPage = parseInt(limit) || 10;
  try {
    if (!userId && !guestId)
      return res.status(400).json({ message: "Thiếu userId hoặc guestId" });

    const query = userId ? { userId } : { guestId };
    const orders = await Order.find(query)
      .populate("userId")
      .populate("products.productId")
      .sort({ createdAt: -1 })
      .skip((pageCurrent - 1) * limitPage)
      .limit(limitPage);

    const total = await Order.countDocuments(query);

    const formattedOrders = await Promise.all(
      orders.map(async (orderDoc) => {
        const order = orderDoc.toObject();
        if (order.voucherCode) {
          order.voucher = await Voucher.findOne({
            code: order.voucherCode.trim().toUpperCase(),
          });
        }
        return order;
      }),
    );

    return res.status(200).json({
      status: "ok",
      message: "Successfully fetched all products",
      data: formattedOrders,
      total,
      pageCurrent,
      totalPage: Math.ceil(total / limitPage),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Lấy tất cả đơn hàng (admin)
// ================================================================
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    if (isNaN(page) || isNaN(limit))
      return res.status(422).json({ message: "Trang không hợp lệ" });

    const total = await Order.countDocuments();
    const orders = await Order.find()
      .populate("userId")
      .populate("products.productId")
      .limit(limit)
      .skip(page * limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "ok",
      message: "Successfully fetched all products",
      data: orders,
      total,
      pageCurrent: page + 1,
      totalPage: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId")
      .populate("products.productId");
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Chi tiết đơn hàng
// ================================================================
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId")
      .populate("products.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const history = await OrderStatusHistory.find({ orderId: order._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ order, history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Cập nhật đơn hàng (admin)
// ================================================================
const statusLabels = {
  pending: "Đang xử lý",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  canceled: "Đã hủy",
  "return-request": "Yêu cầu hoàn hàng",
  accepted: "Chấp nhận hoàn hàng",
  rejected: "Từ chối hoàn hàng",
};

exports.updateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { status, fullName, email, phone, address, note } = req.body;

    const VALID_STATUSES = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "canceled",
      "return-request",
      "accepted",
      "rejected",
    ];

    const TRANSITIONS = {
      pending: ["confirmed", "canceled"],
      confirmed: ["shipped", "canceled"],
      shipped: ["delivered"],
      delivered: ["return-request"],
      canceled: [],
      "return-request": ["accepted", "rejected"],
      accepted: [],
      rejected: [],
    };

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(422).json({ message: "Trạng thái không hợp lệ" });
    }

    if (status && status !== order.status) {
      const allowedNext = TRANSITIONS[order.status] || [];
      if (!allowedNext.includes(status)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(422).json({
          message: `Không thể chuyển từ "${statusLabels[order.status]}" sang "${statusLabels[status]}".`,
        });
      }
    }

    const NON_EDITABLE_STATUSES = [
      "shipped",
      "delivered",
      "canceled",
      "return-request",
      "accepted",
      "rejected",
    ];
    const isLockedStatus = NON_EDITABLE_STATUSES.includes(order.status);
    const tryingToEditOtherFields = fullName || email || phone || address;

    if (isLockedStatus && tryingToEditOtherFields) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        message: `Không thể chỉnh sửa thông tin khi đơn hàng đang ở trạng thái "${statusLabels[order.status]}".`,
      });
    }

    const updateFields = {};
    if (status && status !== order.status) {
      updateFields.status = status;
      if (status === "delivered" && order.paymentStatus !== "paid")
        updateFields.paymentStatus = "paid";
    }
    if (!isLockedStatus) {
      if (fullName) updateFields.fullName = fullName;
      if (email) updateFields.email = email;
      if (phone) updateFields.phone = phone;
      if (address) updateFields.address = address;
    }

    if (Object.keys(updateFields).length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(422)
        .json({ message: "Không có thông tin nào để cập nhật" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, session },
    ).populate("products.productId");

    // Đồng bộ tồn kho Inventory theo vòng đời đơn hàng
    if (status && status !== order.status) {
      // Nếu đơn bị hủy từ trạng thái có thể đang giữ hàng, release reserve
      if (status === "canceled") {
        for (const item of order.products) {
          if (!item.sku || !item.quantity) continue;
          await inventoryService.releaseBySku(
            item.sku,
            item.quantity,
            order._id,
            null,
          );
        }
      }

      // Khi chuyển sang shipped: xuất kho thực tế, đồng thời giải phóng phần đã giữ
      if (status === "shipped") {
        for (const item of order.products) {
          if (!item.sku || !item.quantity) continue;
          await inventoryService.releaseBySku(
            item.sku,
            item.quantity,
            order._id,
            null,
          );
          await inventoryService.exportBySku(
            item.sku,
            item.quantity,
            order._id,
            null,
            null,
            `Xuất kho theo đơn hàng #${order._id}`,
          );
        }
      }

      await OrderStatusHistory.create(
        [
          {
            oldStatus: order.status,
            newStatus: updateFields.status,
            orderId: order._id,
            paymentStatus:
              status === "delivered" && order.paymentStatus !== "paid"
                ? "paid"
                : null,
            note,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json(updatedOrder);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Cập nhật đơn hàng (user)
// ================================================================
exports.updateOrderById = async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, address, status } = req.body;
  try {
    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "pending")
      return res
        .status(400)
        .json({ message: "Đơn hàng đã xử lý, không thể chỉnh sửa" });

    if (fullName) order.fullName = fullName;
    if (email) order.email = email;
    if (phone) order.phone = phone;
    if (address) order.address = address;
    if (status === "canceled") order.status = "canceled";

    const updated = await order.save();
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Xác nhận đã nhận hàng (user)
// ================================================================
exports.comfirmDelivery = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "shipped")
      return res.status(400).json({ message: "Đơn hàng chưa chuyển hàng" });

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status: "delivered", paymentStatus: "paid" },
      { new: true },
    ).populate("products.productId");

    await OrderStatusHistory.create({
      oldStatus: "shipped",
      newStatus: "delivered",
      orderId: order._id,
      paymentStatus: updatedOrder.paymentStatus === "paid" ? null : "paid",
    });

    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Xóa đơn hàng
// ================================================================
exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder)
      return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Dashboard tổng quan
// ================================================================
exports.dashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const [totalOrders, totalRevenue, canceledOrders, deliveredOrders] =
      await Promise.all([
        Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              $or: [
                { paymentStatus: "paid" },
                { paymentMethod: "cod", status: "delivered" },
              ],
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Order.countDocuments({
          createdAt: { $gte: start, $lte: end },
          status: "canceled",
        }),
        Order.countDocuments({
          createdAt: { $gte: start, $lte: end },
          status: "delivered",
        }),
      ]);

    const result = {
      totalOrders: totalOrders || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      canceledOrders: canceledOrders || 0,
      deliveredOrders: deliveredOrders || 0,
      successRate:
        totalOrders > 0
          ? ((deliveredOrders / totalOrders) * 100).toFixed(2)
          : 0,
    };

    res.status(200).json({
      status: "ok",
      message: "Successfully fetched dashboard data",
      data: result,
      totalOrders: result.totalOrders,
      totalRevenue: result.totalRevenue,
      canceledOrders: result.canceledOrders,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err?.message || "Internal server error",
    });
  }
};

// ================================================================
// Doanh thu theo thời gian
// ================================================================
exports.revenue = async (req, res) => {
  try {
    const { startDate, endDate, unit = "day" } = req.query;
    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ status: "error", message: "Missing startDate or endDate" });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const groupMap = {
      year: { $year: "$createdAt" },
      month: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
      week: { year: { $year: "$createdAt" }, week: { $isoWeek: "$createdAt" } },
      hour: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        hour: { $hour: "$createdAt" },
      },
    };
    const groupId = groupMap[unit] || {
      $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
    };

    const results = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: groupId,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedResults = results.map((item) => {
      let name = "";
      if (unit === "day" && typeof item._id === "string") {
        const d = new Date(item._id);
        name = `${d.getDate()}/${d.getMonth() + 1}`;
      } else {
        const nameMap = {
          year: `${item._id}`,
          month: `${item._id.month}/${item._id.year}`,
          week: `Tuần ${item._id.week}/${item._id.year}`,
          hour: `${String(item._id.hour).padStart(2, "0")}:00`,
        };
        name = nameMap[unit] || item._id?.toString() || "N/A";
      }
      return { ...item, name };
    });

    res.status(200).json({
      status: "ok",
      message: "Successfully fetched revenue data",
      data: formattedResults,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err?.message || "Internal server error",
    });
  }
};

// ================================================================
// Top sản phẩm bán chạy
// ================================================================
exports.topSelling = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const result = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: "canceled" },
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: {
            productId: "$products.productId",
            sku: "$products.sku",
            attributes: "$products.attributes",
          },
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "products",
          localField: "_id.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productName: { $ifNull: ["$product.name", "Unknown Product"] },
          productPrice: { $ifNull: ["$product.price", 0] },
          sku: { $ifNull: ["$_id.sku", "N/A"] },
          attributes: { $ifNull: ["$_id.attributes", {}] },
          totalQuantity: 1,
          totalRevenue: {
            $multiply: ["$totalQuantity", { $ifNull: ["$product.price", 0] }],
          },
        },
      },
    ]);

    res.status(200).json({
      status: "ok",
      message: "Successfully fetched top selling products",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err?.message || "Internal server error",
    });
  }
};

// ================================================================
// Thống kê phương thức thanh toán
// ================================================================
exports.paymentMethod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const result = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const methodMap = {
      cod: "COD",
      vnpay: "VNPay",
      momo: "MoMo",
      wallet: "Ví điện tử",
    };
    const formattedResult = result.map((item) => ({
      _id: item._id,
      method: methodMap[item._id] || item._id || "Unknown",
      count: item.count,
      totalAmount: item.totalAmount,
      percentage: 0,
    }));

    const totalCount = formattedResult.reduce((sum, i) => sum + i.count, 0);
    formattedResult.forEach((i) => {
      i.percentage =
        totalCount > 0 ? ((i.count / totalCount) * 100).toFixed(2) : 0;
    });

    res.status(200).json({
      status: "ok",
      message: "Successfully fetched payment method statistics",
      data: formattedResult,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err?.message || "Internal server error",
    });
  }
};

// ================================================================
// VNPay: Tạo URL thanh toán
// POST /api/order/:id/create-vnpay-url
// Body: { returnUrl, cancelUrl }
// ================================================================
exports.createVnpayUrl = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { returnUrl, cancelUrl } = req.body || {};
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.paymentMethod !== "vnpay")
      return res.status(400).json({ message: "Đơn hàng không dùng VNPay" });
    if (order.paymentStatus === "paid")
      return res.status(400).json({ message: "Đơn hàng đã thanh toán" });

    const baseUrl = process.env.FE_URL || "http://localhost:3000";
    const vnp = getVnpayClient();
    const url = vnp.buildPaymentUrl({
      vnp_Amount: order.totalAmount,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_ReturnUrl: returnUrl || `${baseUrl}/payment/return`,
      vnp_IpAddr: req.ip || "127.0.0.1",
    });
    res.status(200).json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// VNPay: Return URL sau khi thanh toán (redirect từ VNPay)
// GET /api/order/return-payment?vnp_ResponseCode=00&vnp_TxnRef=...
// ================================================================
exports.returnPayment = async (req, res) => {
  try {
    const vnp = getVnpayClient();
    const result = vnp.verifyReturnUrl(req.query);
    const orderId = result.vnp_TxnRef;
    const feUrl = process.env.FE_URL || "http://localhost:3000";

    if (result.isVerified && result.isSuccess) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "paid" });
      return res.redirect(
        `${feUrl}/payment/return?success=1&orderId=${orderId}`,
      );
    }
    return res.redirect(`${feUrl}/payment/return?success=0&orderId=${orderId}`);
  } catch (err) {
    const feUrl = process.env.FE_URL || "http://localhost:3000";
    return res.redirect(`${feUrl}/payment/return?success=0&error=1`);
  }
};

// ================================================================
// User: Tạo yêu cầu hoàn hàng
// POST /api/order/:id/return-request
// ================================================================
exports.returnOrderRequest = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "delivered")
      return res
        .status(400)
        .json({ message: "Chỉ đơn hàng đã giao mới được yêu cầu hoàn hàng" });
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "return-request" },
      { new: true },
    ).populate("products.productId");
    await OrderStatusHistory.create({
      oldStatus: "delivered",
      newStatus: "return-request",
      orderId: order._id,
      note: req.body?.reason || "",
    });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// Admin: Chấp nhận hoặc từ chối hoàn hàng
// ================================================================
exports.acceptOrRejectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const action = req.path.includes("accept") ? "accepted" : "rejected";
    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "return-request")
      return res
        .status(400)
        .json({ message: "Đơn hàng không ở trạng thái yêu cầu hoàn hàng" });
    const updated = await Order.findByIdAndUpdate(
      id,
      { status: action },
      { new: true },
    ).populate("products.productId");
    await OrderStatusHistory.create({
      oldStatus: "return-request",
      newStatus: action,
      orderId: order._id,
      note: req.body?.note || "",
    });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
