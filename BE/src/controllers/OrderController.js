const { default: mongoose } = require("mongoose");
const Order = require("../models/OrderModel.js");
const Product = require("../models/ProductModel.js");
const Voucher = require("../models/VoucherModel.js");
const OrderStatusHistory = require("../models/orderStatusHistory.js");
const { successResponse, errorResponse } = require("../utils/response.js");
const User = require("../models/UserModel.js");
const {
  VNPay,
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  InpOrderAlreadyConfirmed,
  IpnInvalidAmount,
  IpnUnknownError,
} = require("vnpay");
const { pickBestActiveRule, calculateEffectivePrice } = require("../utils/salePricing");
const { restoreVariantStockBySku } = require("../utils/stockRestore");
const { isLineActive, sumActiveSubtotal } = require("../utils/orderLines");
const {
  buildWalletRefundPatchForReturn,
  debitWalletForUserOrder,
  buildWalletCancelRefundPatch,
  creditWalletForOrderLineCancel,
} = require("../services/walletService.js");
const VoucherService = require("../services/VoucherService.js");
const {
  evaluateVoucherDiscount,
  useVoucher,
  releaseVoucherForOrder,
} = VoucherService;
const {
  orderAttributesFromVariant,
  findVariantBySku,
} = require("../utils/variantHelpers.js");
const {
  notifyCustomerOfAdminOrderCancel,
} = require("../services/orderCancelNotify.js");

const ROLE_VOUCHER_USAGE_LIMIT = {
  customer: 3,
  staff: 5,
  manager: 10,
  admin: 0,
};
const GUEST_VOUCHER_USAGE_LIMIT = 2;




/** Không tính doanh thu: hủy đơn, đang yêu cầu hoàn hàng, hoặc đã chấp nhận hoàn (đã hoàn tiền). */
const ORDER_STATUSES_EXCLUDED_FROM_REVENUE = [
  "canceled",
  "return-request",
  "accepted",
];

/** Thứ Hai 00:00 UTC của tuần ISO `week` trong năm ISO `isoWeekYear` (khớp Mongo $isoWeek / $isoWeekYear). */
function isoWeekMondayUtcMs(isoWeekYear, week) {
  const jan4 = Date.UTC(isoWeekYear, 0, 4);
  let dow = new Date(jan4).getUTCDay();
  if (dow === 0) dow = 7;
  const week1Monday = jan4 - (dow - 1) * 86400000;
  return week1Monday + (week - 1) * 7 * 86400000;
}

/** Hiển thị Thứ 2 → Chủ nhật (UTC) cho nhãn biểu đồ. */
function formatIsoWeekRangeLabelVi(isoWeekYear, week) {
  const m0 = isoWeekMondayUtcMs(isoWeekYear, week);
  const m6 = m0 + 6 * 86400000;
  const fmt = (ms) => {
    const d = new Date(ms);
    return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  return `${fmt(m0)} → ${fmt(m6)}`;
}

// Khi không khai báo VNP_* trong .env sẽ dùng fallback bên dưới.
// Chỉ truyền host (không thêm /paymentv2/...): thư viện tự nối endpoint thanh toán.
const vnpayEnv = (key, fallback) => {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") return fallback;
  return String(v).trim();
};

const getVnpayClient = () =>
  new VNPay({
    tmnCode: vnpayEnv("VNP_TMN_CODE", "DEMOMERCHANT01"),
    secureSecret: vnpayEnv("VNP_HASH_SECRET", "SECRETKEY"),
    // Chỉ hostname; thư viện tự ghép paymentv2/vpcpay.html (trùng URL sandbox VNPay cấp).
    vnpayHost: vnpayEnv("VNP_URL", "https://sandbox.vnpayment.vn"),
    testMode: String(process.env.VNP_TEST_MODE || "true") !== "false",
  });

const getBackendPublicBaseUrl = (req) => {
  if (process.env.BE_URL) return process.env.BE_URL;
  if (process.env.API_URL) return process.env.API_URL.replace(/\/api\/?$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
};

/**
 * Tạo URL thanh toán VNPay. vnp_ReturnUrl phải là API backend để verify chữ ký.
 * Nên set BE_URL (vd: http://localhost:3002) khi dev để VNPay redirect đúng host.
 */
const buildVnpayPaymentUrlForOrder = (req, order, returnUrl, cancelUrl) => {
  const baseUrl = process.env.FE_URL || "http://localhost:3000";
  // Giả sử bạn đã định nghĩa hàm getBackendPublicBaseUrl và getVnpayClient ở trên
  const backendBaseUrl = getBackendPublicBaseUrl(req); 
  
  const redirectSuccess = encodeURIComponent(
    returnUrl || `${baseUrl}/payment/return`
  );
  const redirectCancel = encodeURIComponent(
    cancelUrl || `${baseUrl}/checkout`
  );
  
  const vnp = getVnpayClient();
  return vnp.buildPaymentUrl({
    vnp_Amount: order.totalAmount,
    vnp_TxnRef: String(order._id),
    vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
    vnp_ReturnUrl: `${backendBaseUrl}/api/order/return-payment?redirect=${redirectSuccess}&cancelRedirect=${redirectCancel}`,
    vnp_IpAddr: req.ip || "127.0.0.1",
  });
};

/**
 * Hoàn tồn kho khi admin chấp nhận hoàn hàng (order đã populate products.productId).
 */
async function restoreStockForAcceptedReturn(order, session) {
  for (const item of order.products || []) {
    const qty = Number(item?.quantity || 0);
    if (qty <= 0) continue;

    const productDoc = item.productId;
    if (!productDoc) continue;
    if (item.sku && productDoc.hasVariants) {
      const variant = findVariantBySku(productDoc.variants, item.sku);
      if (variant) {
        variant.stock = Number(variant.stock || 0) + qty;
        await productDoc.save({ session });
      }
    } else if (!productDoc.hasVariants) {
      productDoc.stock = Number(productDoc.stock || 0) + qty;
      await productDoc.save({ session });
    }
  }
}

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
      voucherCode,
      voucherTarget,
      vnpReturnUrl,
      vnpCancelUrl,
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

    if (paymentMethod === "wallet" && !userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(422).json({
        message: "Vui lòng đăng nhập để thanh toán bằng ví",
      });
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

    const shippingFee = 0; // Đã bỏ giao hàng hỏa tốc, tất cả đều là 0đ
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
        const normalizedSku =
          item.sku == null ? null : String(item.sku).trim().toUpperCase();
        const variant = product.variants.find(
          (v) => String(v.sku).trim().toUpperCase() === normalizedSku,
        );
        if (!variant) {
          await session.abortTransaction();
          session.endSession();
          const availableSkus = Array.isArray(product.variants)
            ? product.variants.map((v) => v.sku).filter(Boolean)
            : [];
          return res.status(400).json({
            message: `Không tìm thấy biến thể SKU ${item.sku} cho sản phẩm ${product.name}`,
            availableSkus,
            productId: item.productId,
            invalidSku: normalizedSku,
          });
        }

        const saleRule = pickBestActiveRule({
          rules: product.saleRules,
          sku: variant.sku,
          now: new Date(),
        });
        const pricing = calculateEffectivePrice({
          basePrice: variant.price,
          saleRule,
        });
        mappedProducts.push({
          productId: item.productId,
          sku: variant.sku,
          quantity: item.quantity,
          price: pricing.effectivePrice,
          basePrice: pricing.basePrice,
          lineDiscount: pricing.discountAmount,
          appliedSaleRuleId: pricing.saleRule?._id || null,
          appliedSaleName: pricing.saleRule?.name || null,
          attributes: orderAttributesFromVariant(variant),
        });
      } else {
        const availableStock = Number(product.stock ?? 0);
        if (availableStock < item.quantity) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: `Không đủ hàng cho sản phẩm ${product.name} (khả dụng: ${availableStock})`,
          });
        }

        // Sản phẩm không biến thể: trừ tồn trực tiếp ngay khi tạo đơn.
        product.stock = availableStock - Number(item.quantity || 0);
        await product.save({ session });

        const saleRule = pickBestActiveRule({
          rules: product.saleRules,
          sku: null,
          now: new Date(),
        });
        const pricing = calculateEffectivePrice({
          basePrice: product.price,
          saleRule,
        });
        mappedProducts.push({
          productId: item.productId,
          sku: null,
          quantity: item.quantity,
          price: pricing.effectivePrice,
          basePrice: pricing.basePrice,
          lineDiscount: pricing.discountAmount,
          appliedSaleRuleId: pricing.saleRule?._id || null,
          appliedSaleName: pricing.saleRule?.name || null,
          attributes: {},
        });
      }
    }

    // Trừ tồn biến thể trực tiếp trên Product (đã xóa module Inventory)
    const subtotal = mappedProducts.reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0,
    );

    let normalizedVoucherCode = null;
    let discountAmount = 0;
    let voucherDoc = null;

    if (voucherCode) {
      normalizedVoucherCode = String(voucherCode).trim().toUpperCase();
      voucherDoc = await Voucher.findOne({
        code: normalizedVoucherCode,
        isDeleted: false,
      }).session(session);

      if (!voucherDoc) {
        await session.abortTransaction();
        session.endSession();
        return res.status(422).json({ message: "Voucher không tồn tại" });
      }

      const actorUser = user
        ? {
            id: String(user._id),
            isAdmin: Boolean(user.isAdmin),
            isStaff: Boolean(user.isStaff),
          }
        : userId
          ? {
              id: String(userId),
              isAdmin: false,
              isStaff: false,
            }
          : null;

      const voucherItems = mappedProducts.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
      }));

      const evaluated = await evaluateVoucherDiscount({
        voucherDoc,
        actorUser,
        userId,
        guestId: String(guestId || "").trim() || null,
        items: voucherItems,
        voucherTarget,
        orderValueOverride: subtotal,
      });

      if (evaluated.status === "ERR") {
        await session.abortTransaction();
        session.endSession();
        return res.status(422).json({ message: evaluated.message });
      }

      if (evaluated.data?.requiresProductSelection) {
        await session.abortTransaction();
        session.endSession();
        return res.status(422).json({
          message:
            "Voucher cá nhân yêu cầu chọn sản phẩm áp dụng giảm giá",
        });
      }

      discountAmount = Number(evaluated.data?.discountAmount ?? 0);

      const customAccountLimit = Number(user?.voucherUsageLimit);
      let accountVoucherLimit = 0;
      if (Number.isFinite(customAccountLimit) && customAccountLimit >= 0) {
        accountVoucherLimit = customAccountLimit;
      } else if (userId) {
        accountVoucherLimit =
          ROLE_VOUCHER_USAGE_LIMIT[String(user?.role || "customer")] ??
          ROLE_VOUCHER_USAGE_LIMIT.customer;
      } else {
        accountVoucherLimit = GUEST_VOUCHER_USAGE_LIMIT;
      }

      if (accountVoucherLimit !== 0) {
        const accountQuery = userId
          ? { userId }
          : { guestId: String(guestId || "").trim() };
        const usedVoucherOrderCount = await Order.countDocuments({
          ...accountQuery,
          voucherCode: { $ne: null },
          status: { $ne: "canceled" },
        }).session(session);

        if (usedVoucherOrderCount >= accountVoucherLimit) {
          await session.abortTransaction();
          session.endSession();
          return res.status(422).json({
            message: `Tài khoản đã đạt giới hạn dùng voucher (${accountVoucherLimit} lần).`,
          });
        }
      }
    }

    for (const item of mappedProducts) {
      if (!item.sku) continue;
      const productForStock = await Product.findById(item.productId).session(
        session,
      );
      if (!productForStock) {
        throw new Error("Không tìm thấy sản phẩm");
      }
      const variant = findVariantBySku(productForStock.variants, item.sku);
      const available = Number(variant?.stock ?? 0);
      if (!variant || available < item.quantity) {
        throw new Error(
          `Không đủ hàng cho SKU ${item.sku} (khả dụng: ${available})`,
        );
      }
      variant.stock = available - item.quantity;
      await productForStock.save({ session });
    }

    const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

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
      discount: discountAmount,
      voucherCode: normalizedVoucherCode,
      voucherTargetProductId: voucherTarget?.productId || null,
      voucherTargetSku: voucherTarget?.sku
        ? String(voucherTarget.sku).trim().toUpperCase()
        : null,
      shippingFee,
      totalAmount: finalTotal,
      paymentStatus: "unpaid",
      voucherConsumed: false,
    });

    const savedOrder = await newOrder.save({ session });

    if (paymentMethod === "wallet") {
      if (finalTotal <= 0) {
        await Order.findByIdAndUpdate(
          savedOrder._id,
          { paymentStatus: "paid" },
          { session },
        );
      } else {
        try {
          const { walletPaymentTransactionId } = await debitWalletForUserOrder(
            userId,
            savedOrder._id,
            finalTotal,
            session,
          );
          await Order.findByIdAndUpdate(
            savedOrder._id,
            {
              paymentStatus: "paid",
              walletPaymentTransactionId,
            },
            { session },
          );
        } catch (debitErr) {
          await session.abortTransaction();
          session.endSession();
          if (debitErr.statusCode === 422) {
            return res.status(422).json({
              message: debitErr.message,
              balance: debitErr.balance,
              required: debitErr.required,
            });
          }
          throw debitErr;
        }
      }
    }

    if (voucherDoc && paymentMethod !== "vnpay") {
      try {
        await useVoucher(
          {
            code: normalizedVoucherCode,
            userId,
            guestId: String(guestId || "").trim() || null,
            orderId: savedOrder._id,
          },
          session,
        );
        await Order.findByIdAndUpdate(
          savedOrder._id,
          { voucherConsumed: true },
          { session },
        );
      } catch (ve) {
        await session.abortTransaction();
        session.endSession();
        return res.status(422).json({
          message: ve.message || "Không áp dụng được voucher",
        });
      }
    }

    await OrderStatusHistory.create(
      [{ newStatus: savedOrder.status, orderId: savedOrder._id }],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    const orderOut = await Order.findById(savedOrder._id).populate(
      "products.productId",
    );

    if (paymentMethod === "vnpay") {
      const orderJson =
        typeof orderOut.toObject === "function"
          ? orderOut.toObject()
          : orderOut;
      try {
        const vnpayPaymentUrl = buildVnpayPaymentUrlForOrder(
          req,
          orderOut,
          vnpReturnUrl,
          vnpCancelUrl,
        );
        return res.status(201).json({ ...orderJson, vnpayPaymentUrl });
      } catch (vnpErr) {
        return res.status(201).json({
          ...orderJson,
          vnpayPaymentUrl: null,
          vnpayBuildError: vnpErr?.message || "Không tạo được link VNPay",
        });
      }
    }

    return res.status(201).json(orderOut);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      message: err.message,
      name: err?.name,
      ...(process.env.NODE_ENV !== "production" ? { stack: err?.stack } : {}),
    });
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

    const orderIds = orders.map((o) => o._id);
    let cancelNoteByOrderId = {};
    if (orderIds.length) {
      const rows = await OrderStatusHistory.aggregate([
        { $match: { orderId: { $in: orderIds }, newStatus: "canceled" } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$orderId", note: { $first: "$note" } } },
      ]);
      cancelNoteByOrderId = rows.reduce((acc, r) => {
        acc[String(r._id)] = r.note || "";
        return acc;
      }, {});
    }

    const formattedOrders = await Promise.all(
      orders.map(async (orderDoc) => {
        const order = orderDoc.toObject();
        if (order.voucherCode) {
          order.voucher = await Voucher.findOne({
            code: order.voucherCode.trim().toUpperCase(),
          });
        }
        const st = String(order.status || "").trim().toLowerCase();
        if (st === "canceled") {
          const cn = cancelNoteByOrderId[String(order._id)];
          if (cn) order.cancelReasonNote = cn;
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
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
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

    const startDateRaw = String(req.query.startDate || "").trim();
    const endDateRaw = String(req.query.endDate || "").trim();
    const filter = {};
    if (startDateRaw || endDateRaw) {
      const createdAt = {};
      if (startDateRaw) {
        const start = new Date(startDateRaw);
        if (Number.isNaN(start.getTime())) {
          return res.status(422).json({ message: "startDate không hợp lệ" });
        }
        start.setHours(0, 0, 0, 0);
        createdAt.$gte = start;
      }
      if (endDateRaw) {
        const end = new Date(endDateRaw);
        if (Number.isNaN(end.getTime())) {
          return res.status(422).json({ message: "endDate không hợp lệ" });
        }
        end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }
      filter.createdAt = createdAt;
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
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
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId")
      .populate("products.productId");
    res.status(200).json(orders);
  } catch (err) {
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
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
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
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
  received: "Đã giao thành công",
  canceled: "Đã hủy",
  "return-request": "Yêu cầu hoàn hàng",
  accepted: "Chấp nhận hoàn hàng",
  rejected: "Từ chối hoàn hàng",
};

exports.updateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { status, fullName, email, phone, address, note, lookup } = req.body;

    const VALID_STATUSES = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "received",
      "canceled",
      "return-request",
      "accepted",
      "rejected",
    ];

    const TRANSITIONS = {
      pending: ["confirmed", "canceled"],
      confirmed: ["shipped", "canceled"],
      shipped: [],
      delivered: [],
      received: [],
      canceled: [],
      "return-request": ["accepted", "rejected"],
      accepted: [],
      rejected: [],
    };

    const rawId = String(req.params.id || "")
      .trim()
      .replace(/^#/, "")
      .replace(/[^a-fA-F0-9]/g, "");

    let order = null;
    if (/^[a-fA-F0-9]{24}$/.test(rawId)) {
      order = await Order.findById(rawId).session(session);
    }

    // Fallback: FE có thể gửi mã rút gọn (8 ký tự cuối) hoặc đoạn id ngắn.
    if (!order && /^[a-fA-F0-9]{6,24}$/.test(rawId)) {
      const upper = rawId.toUpperCase();
      order = await Order.findOne({
        $expr: {
          $regexMatch: {
            input: { $toUpper: { $toString: "$_id" } },
            regex: `${upper}$`,
          },
        },
      }).session(session);
    }
    // Fallback cuối: dò theo thông tin hàng trong bảng admin.
    if (!order && lookup?.createdAt) {
      const createdAt = new Date(lookup.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        const from = new Date(createdAt.getTime() - 1500);
        const to = new Date(createdAt.getTime() + 1500);
        const query = {
          createdAt: { $gte: from, $lte: to },
        };
        if (lookup.totalAmount != null) {
          query.totalAmount = Number(lookup.totalAmount);
        }
        if (lookup.fullName) {
          query.fullName = String(lookup.fullName).trim();
        }
        order = await Order.findOne(query).session(session);
      }
    }
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

    /** Admin hủy đơn qua PUT: bắt buộc lưu lý do (ghi OrderStatusHistory). */
    let historyNote = note;
    if (status === "canceled" && order.status !== "canceled") {
      const trimmed =
        typeof note === "string" ? note.trim() : String(note ?? "").trim();
      if (trimmed.length < 5) {
        await session.abortTransaction();
        session.endSession();
        return res.status(422).json({
          message: "Khi hủy đơn, bắt buộc nhập lý do (ít nhất 5 ký tự).",
        });
      }
      historyNote = trimmed;
    }

    const adminCanceledOrder =
      status === "canceled" && order.status !== "canceled";

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

    if (status === "canceled" && order.status !== "canceled") {
      const walletCancelPatch = await buildWalletCancelRefundPatch(
        order,
        session,
      );
      Object.assign(updateFields, walletCancelPatch);
      if (order.voucherCode && order.voucherConsumed) {
        await releaseVoucherForOrder(
          {
            code: String(order.voucherCode).trim().toUpperCase(),
            orderId: order._id,
          },
          session,
        );
      }
      if (order.voucherCode) {
        updateFields.voucherCode = null;
        updateFields.discount = 0;
        updateFields.voucherConsumed = false;
      }
      updateFields.products = (order.products || []).map((item) => {
        const plain =
          item && typeof item.toObject === "function"
            ? item.toObject()
            : { ...item };
        return {
          ...plain,
          lineStatus: "canceled",
          canceledAt: plain.canceledAt || new Date(),
          canceledBy: plain.canceledBy || "admin",
        };
      });
    }

    // Khi Admin chấp nhận hoàn (accepted từ trạng thái return-request)
    if (status === "accepted" && order.status === "return-request") {
      const orderPop = await Order.findById(order._id)
        .populate("products.productId")
        .session(session);
      await restoreStockForAcceptedReturn(orderPop, session);
      const walletReturnPatch = await buildWalletRefundPatchForReturn(
        orderPop,
        session,
      );
      Object.assign(updateFields, walletReturnPatch);
    }


    if (Object.keys(updateFields).length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(422)
        .json({ message: "Không có thông tin nào để cập nhật" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      updateFields,
      { new: true, session },
    ).populate("products.productId");

    // Hoàn tồn Product khi hủy đơn (tồn đã trừ lúc tạo đơn)
    if (status && status !== order.status) {
      if (status === "canceled") {
        for (const item of order.products) {
          if (!item?.quantity) continue;
          if (String(item.lineStatus || "active") === "canceled") continue;
          if (item.sku) {
            await restoreVariantStockBySku(item, item.quantity, session);
            continue;
          }

          const productDoc = await Product.findById(item.productId).session(
            session,
          );
          if (productDoc && !productDoc.hasVariants) {
            productDoc.stock =
              Number(productDoc.stock || 0) + Number(item.quantity || 0);
            await productDoc.save({ session });
          }
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
            note: historyNote,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    if (adminCanceledOrder && historyNote) {
      try {
        const orderForNotify = await Order.findById(order._id).populate(
          "userId",
        );
        if (orderForNotify) {
          await notifyCustomerOfAdminOrderCancel({
            order: orderForNotify,
            note: historyNote,
          });
        }
      } catch (notifyErr) {
        console.error(
          "[OrderController] notifyCustomerOfAdminOrderCancel:",
          notifyErr?.message || notifyErr,
        );
      }
    }

    res.status(200).json(updatedOrder);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

// ================================================================
// Cập nhật đơn hàng (user)
// ================================================================
exports.updateOrderById = async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, address, status, cancelReason } = req.body;
  try {
    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const editableStatuses = ["pending", "confirmed"];
    if (!editableStatuses.includes(order.status)) {
      return res.status(400).json({
        message:
          "Đơn hàng đã chuyển sang trạng thái giao, không thể chỉnh sửa/hủy",
      });
    }

    if (status === "canceled" && order.status !== "canceled") {
      const normalizedCancelReason =
        typeof cancelReason === "string"
          ? cancelReason.trim()
          : String(cancelReason ?? "").trim();
      if (normalizedCancelReason.length < 5) {
        return res.status(422).json({
          message: "Vui lòng nhập lý do hủy đơn (tối thiểu 5 ký tự).",
        });
      }
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const o = await Order.findById(id).session(session);
        if (!o) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        if (fullName) o.fullName = fullName;
        if (email) o.email = email;
        if (phone) o.phone = phone;
        if (address) o.address = address;

        const oldStatus = o.status;
        o.status = "canceled";

        for (const item of o.products || []) {
          if (!item?.quantity) continue;
          if (String(item.lineStatus || "active") === "canceled") continue;

          if (item.sku) {
            await restoreVariantStockBySku(item, item.quantity, session);
            continue;
          }

          const productDoc = await Product.findById(item.productId).session(
            session,
          );
          if (productDoc && !productDoc.hasVariants) {
            productDoc.stock =
              Number(productDoc.stock || 0) + Number(item.quantity || 0);
            await productDoc.save({ session });
          }
        }

        for (const item of o.products || []) {
          if (!item) continue;
          item.lineStatus = "canceled";
          item.canceledAt = item.canceledAt || new Date();
          item.canceledBy = item.canceledBy || "user";
        }
        o.markModified("products");

        if (o.voucherCode && o.voucherConsumed) {
          await releaseVoucherForOrder(
            {
              code: String(o.voucherCode).trim().toUpperCase(),
              orderId: o._id,
            },
            session,
          );
        }
        if (o.voucherCode) {
          o.voucherCode = null;
          o.discount = 0;
          o.voucherConsumed = false;
        }

        const walletPatch = await buildWalletCancelRefundPatch(o, session);
        Object.assign(o, walletPatch);
        await o.save({ session });

        await OrderStatusHistory.create(
          [
            {
              oldStatus,
              newStatus: "canceled",
              orderId: o._id,
              note: normalizedCancelReason,
            },
          ],
          { session },
        );

        await session.commitTransaction();
        session.endSession();
      } catch (innerErr) {
        await session.abortTransaction();
        session.endSession();
        throw innerErr;
      }

      const updated = await Order.findById(id).populate("products.productId");
      return res.status(200).json(updated);
    }

    if (fullName) order.fullName = fullName;
    if (email) order.email = email;
    if (phone) order.phone = phone;
    if (address) order.address = address;

    const updated = await order.save();
    res.status(200).json(updated);
  } catch (err) {
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

function assertUserOwnsOrderForLineCancel(order, reqUser) {
  const uid = String(reqUser?.id || reqUser?._id || "").trim();
  if (!uid) return false;
  if (order.userId && String(order.userId) === uid) return true;
  if (order.guestId && String(order.guestId).trim() === uid) return true;
  return false;
}

const MIN_CANCEL_LINE_REASON_LEN = 5;

function normalizeCancelLineReason(raw) {
  const t =
    typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
  if (t.length < MIN_CANCEL_LINE_REASON_LEN) {
    const e = new Error(
      `Vui lòng nhập lý do hủy (tối thiểu ${MIN_CANCEL_LINE_REASON_LEN} ký tự).`,
    );
    e.statusCode = 422;
    throw e;
  }
  return t.slice(0, 2000);
}

async function cancelOrderLineCore({
  orderId,
  lineIndex,
  canceledBy,
  reqUser,
  requireOwnership,
  cancelReason,
}) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      const e = new Error("Không tìm thấy đơn hàng");
      e.statusCode = 404;
      throw e;
    }

    if (requireOwnership && !assertUserOwnsOrderForLineCancel(order, reqUser)) {
      const e = new Error("Bạn không có quyền thao tác trên đơn này");
      e.statusCode = 403;
      throw e;
    }

    const idx = Number(lineIndex);
    if (
      !Number.isInteger(idx) ||
      idx < 0 ||
      idx >= (order.products || []).length
    ) {
      const e = new Error("Dòng sản phẩm không hợp lệ");
      e.statusCode = 422;
      throw e;
    }

    const line = order.products[idx];
    if (!isLineActive(line)) {
      const e = new Error("Dòng này đã được hủy trước đó");
      e.statusCode = 400;
      throw e;
    }

    const st = String(order.status || "").trim().toLowerCase();
    if (!["pending", "confirmed"].includes(st)) {
      const e = new Error(
        "Chỉ hủy dòng khi đơn đang chờ xử lý hoặc đã xác nhận",
      );
      e.statusCode = 400;
      throw e;
    }

    const reasonText = normalizeCancelLineReason(cancelReason);

    const oldSub = sumActiveSubtotal(order.products);
    const oldTotal = Math.round(Number(order.totalAmount) || 0);

    if (!line?.quantity) {
      const e = new Error("Dòng hàng không hợp lệ");
      e.statusCode = 400;
      throw e;
    }

    if (line.sku) {
      await restoreVariantStockBySku(line, line.quantity, session);
    } else {
      const productDoc = await Product.findById(line.productId).session(
        session,
      );
      if (productDoc && !productDoc.hasVariants) {
        productDoc.stock =
          Number(productDoc.stock || 0) + Number(line.quantity || 0);
        await productDoc.save({ session });
      }
    }

    const prevOrderStatus = order.status;
    line.lineStatus = "canceled";
    line.canceledAt = new Date();
    line.canceledBy = canceledBy;
    line.cancelReason = reasonText;

    const activeAfter = (order.products || []).filter(isLineActive);
    const newSub = sumActiveSubtotal(order.products);

    if (activeAfter.length === 0) {
      order.status = "canceled";
      order.shippingFee = 0;
      order.discount = 0;
      order.totalAmount = 0;
    } else {
      const newDiscount =
        oldSub > 0
          ? Math.round(Number(order.discount || 0) * (newSub / oldSub))
          : 0;
      order.discount = newDiscount;
      order.totalAmount = Math.max(
        0,
        newSub -
          newDiscount +
          Math.round(Number(order.shippingFee || 0)),
      );
    }

    const newTotal = Math.round(Number(order.totalAmount) || 0);

    if (
      (order.paymentMethod === "wallet" || order.paymentMethod === "vnpay") &&
      order.paymentStatus === "paid" &&
      order.userId
    ) {
      const refund = oldTotal - newTotal;
      if (refund > 0) {
        await creditWalletForOrderLineCancel(
          order.userId,
          order._id,
          refund,
          session,
        );
      }
    }

    order.markModified("products");
    await order.save({ session });

    const historyNewStatus = order.status;
    await OrderStatusHistory.create(
      [
        {
          oldStatus: prevOrderStatus,
          newStatus: historyNewStatus,
          orderId: order._id,
          note: `Hủy dòng #${idx + 1} — ${canceledBy === "admin" ? "Admin" : "Khách hàng"}. Lý do: ${reasonText}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    const populated = await Order.findById(order._id)
      .populate("products.productId")
      .populate("userId");
    return populated;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

exports.cancelOrderLineByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const lineIndex = req.body?.lineIndex ?? req.body?.line_index;
    const cancelReason = req.body?.cancelReason ?? req.body?.reason;
    const order = await cancelOrderLineCore({
      orderId: id,
      lineIndex,
      canceledBy: "user",
      reqUser: req.user,
      requireOwnership: true,
      cancelReason,
    });
    const history = await OrderStatusHistory.find({ orderId: order._id }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ order, history });
  } catch (err) {
    const statusCode = err?.statusCode || err?.status || 500;
    return res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

exports.cancelOrderLineByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const lineIndex = req.body?.lineIndex ?? req.body?.line_index;
    const cancelReason = req.body?.cancelReason ?? req.body?.reason;
    const order = await cancelOrderLineCore({
      orderId: id,
      lineIndex,
      canceledBy: "admin",
      reqUser: req.user,
      requireOwnership: false,
      cancelReason,
    });
    const history = await OrderStatusHistory.find({ orderId: order._id }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ order, history });
  } catch (err) {
    const statusCode = err?.statusCode || err?.status || 500;
    return res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
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

    // Chỉ bấm xác nhận khi đơn đã ở trạng thái "đang giao" hoặc "đã giao"
    const currentStatus = String(order.status || "").trim().toLowerCase();
    if (currentStatus === "delivered" || currentStatus === "shipped") {
      const oldStatus = currentStatus;
      const patch =
        order.paymentMethod === "cod" && order.paymentStatus !== "paid"
          ? { status: "received", paymentStatus: "paid" }
          : { status: "received" };
      const updatedOrder = await Order.findByIdAndUpdate(id, patch, {
        new: true,
      }).populate("products.productId");

      await OrderStatusHistory.create({
        oldStatus: oldStatus,
        newStatus: "received",
        orderId: order._id,
        paymentStatus:
          order.paymentMethod === "cod" && order.paymentStatus !== "paid"
            ? "paid"
            : null,
        note: "Người dùng xác nhận đã nhận được hàng",
      });

      return res.status(200).json(updatedOrder);
    }

    return res.status(400).json({
      message: "Chỉ có thể xác nhận khi đơn đang giao hoặc đã giao.",
    });
  } catch (err) {
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
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
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

// ================================================================
// Dashboard tổng quan
// ================================================================
exports.dashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    let end = endDate ? new Date(endDate) : new Date();

    // Cùng một mốc hoặc end <= start (vd. RangePicker hai ngày cùng 00:00) → coi là 1 ngày đầy đủ
    if (end.getTime() <= start.getTime()) {
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    }

    const revenueMatch = (s, e) => ({
      createdAt: { $gte: s, $lte: e },
      status: { $nin: ORDER_STATUSES_EXCLUDED_FROM_REVENUE },
      $or: [
        { paymentStatus: "paid" },
        { paymentMethod: "cod", status: "delivered" },
      ],
    });

    const loadMetrics = async (s, e) => {
      const [totalOrders, totalRevenue, canceledOrders, deliveredOrders] =
        await Promise.all([
          Order.countDocuments({ createdAt: { $gte: s, $lte: e } }),
          Order.aggregate([
            { $match: revenueMatch(s, e) },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ]),
          Order.countDocuments({
            createdAt: { $gte: s, $lte: e },
            status: "canceled",
          }),
          Order.countDocuments({
            createdAt: { $gte: s, $lte: e },
            status: "delivered",
          }),
        ]);
      return {
        totalOrders: totalOrders || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        canceledOrders: canceledOrders || 0,
        deliveredOrders: deliveredOrders || 0,
      };
    };

    const spanMs = end.getTime() - start.getTime();
    let comparisonPeriod = null;
    let revenueChangePercent = null;
    let ordersChangePercent = null;
    let canceledOrdersChangePercent = null;

    let current;
    if (spanMs > 0) {
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - spanMs);
      comparisonPeriod = {
        start: prevStart.toISOString(),
        end: prevEnd.toISOString(),
      };
      const roundPct = (cur, prev) => {
        const c = Number(cur) || 0;
        const p = Number(prev) || 0;
        if (p === 0 && c === 0) return 0;
        if (p === 0) return c > 0 ? 100 : 0;
        return Math.round(((c - p) / p) * 1000) / 10;
      };
      const [cur, prev] = await Promise.all([
        loadMetrics(start, end),
        loadMetrics(prevStart, prevEnd),
      ]);
      current = cur;
      revenueChangePercent = roundPct(cur.totalRevenue, prev.totalRevenue);
      ordersChangePercent = roundPct(cur.totalOrders, prev.totalOrders);
      canceledOrdersChangePercent = roundPct(
        cur.canceledOrders,
        prev.canceledOrders,
      );
    } else {
      current = await loadMetrics(start, end);
    }

    const result = {
      ...current,
      successRate:
        current.totalOrders > 0
          ? ((current.deliveredOrders / current.totalOrders) * 100).toFixed(2)
          : 0,
      comparisonPeriod,
      revenueChangePercent,
      ordersChangePercent,
      canceledOrdersChangePercent,
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
      week: {
        year: { $isoWeekYear: "$createdAt" },
        week: { $isoWeek: "$createdAt" },
      },
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

    const revenueMatch = {
      createdAt: { $gte: start, $lte: end },
      status: { $nin: ORDER_STATUSES_EXCLUDED_FROM_REVENUE },
      $or: [
        { paymentStatus: "paid" },
        { paymentMethod: "cod", status: "delivered" },
      ],
    };

    const serializeGroupKey = (id) =>
      typeof id === "object" && id !== null ? JSON.stringify(id) : String(id);

    const formatBucketName = (idValue) => {
      let name = "";
      if (unit === "day" && typeof idValue === "string") {
        const d = new Date(idValue);
        name = `${d.getDate()}/${d.getMonth() + 1}`;
      } else {
        const nameMap = {
          year: `${idValue}`,
          month: `${idValue.month}/${idValue.year}`,
          week: (() => {
            const y = idValue.year;
            const w = idValue.week;
            const range =
              y != null && w != null
                ? formatIsoWeekRangeLabelVi(Number(y), Number(w))
                : "";
            return range
              ? `Tuần ${w} (${range})`
              : `Tuần ${w}/${y}`;
          })(),
          hour: `${String(idValue.hour).padStart(2, "0")}:00`,
        };
        name = nameMap[unit] || idValue?.toString() || "N/A";
      }
      return name;
    };

    const [revenueResults, orderResults] = await Promise.all([
      Order.aggregate([
        { $match: revenueMatch },
        {
          $group: {
            _id: groupId,
            totalRevenue: { $sum: "$totalAmount" },
            paidOrders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: groupId,
            totalOrders: { $sum: 1 },
            canceledOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "canceled"] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const merged = new Map();

    for (const item of revenueResults) {
      const key = serializeGroupKey(item._id);
      merged.set(key, {
        _id: item._id,
        name: formatBucketName(item._id),
        totalRevenue: item.totalRevenue || 0,
        paidOrders: item.paidOrders || 0,
        totalOrders: 0,
        canceledOrders: 0,
      });
    }

    for (const item of orderResults) {
      const key = serializeGroupKey(item._id);
      const current = merged.get(key) || {
        _id: item._id,
        name: formatBucketName(item._id),
        totalRevenue: 0,
        paidOrders: 0,
        totalOrders: 0,
        canceledOrders: 0,
      };
      current.totalOrders = item.totalOrders || 0;
      current.canceledOrders = item.canceledOrders || 0;
      merged.set(key, current);
    }

    const buildSortKey = (idValue) => {
      if (unit === "day" && typeof idValue === "string") return idValue;
      if (unit === "year") return `${idValue}`;
      if (unit === "month")
        return `${idValue.year}-${String(idValue.month).padStart(2, "0")}`;
      if (unit === "week")
        return `${idValue.year}-${String(idValue.week).padStart(2, "0")}`;
      if (unit === "hour") {
        return `${idValue.year}-${String(idValue.month).padStart(2, "0")}-${String(
          idValue.day,
        ).padStart(2, "0")} ${String(idValue.hour).padStart(2, "0")}:00`;
      }
      return String(idValue);
    };

    const formattedResults = Array.from(merged.values()).sort((a, b) =>
      buildSortKey(a._id).localeCompare(buildSortKey(b._id), "vi-VN", {
        numeric: true,
      }),
    );

    const normalizedResults = formattedResults.map((item) => {
      return {
        ...item,
        // Giữ tương thích ngược: một số chỗ cũ đọc totalOrders từ revenue endpoint
        totalOrdersRevenueMatched: item.paidOrders || 0,
      };
    });

    res.status(200).json({
      status: "ok",
      message: "Successfully fetched revenue data",
      data: normalizedResults,
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
          status: { $nin: ORDER_STATUSES_EXCLUDED_FROM_REVENUE },
        },
      },
      {
        // Một số đơn có thể thiếu `products` (null/undefined) => tránh lỗi $unwind
        $unwind: { path: "$products", preserveNullAndEmptyArrays: true },
      },
      // Lọc bỏ các bản ghi không có productId; bỏ dòng đã hủy riêng lẻ
      {
        $match: {
          "products.productId": { $ne: null },
          "products.lineStatus": { $ne: "canceled" },
        },
      },
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
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $nin: ORDER_STATUSES_EXCLUDED_FROM_REVENUE },
        },
      },
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

    const url = buildVnpayPaymentUrlForOrder(req, order, returnUrl, cancelUrl);
    res.status(200).json({ url });
  } catch (err) {
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

// ================================================================
// VNPay IPN (server-to-server) — khai báo URL tại merchant VNPay:
// GET|POST {BE_URL}/api/order/vnpay-ipn
// ================================================================
const pickVnpParams = (input = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (key.startsWith("vnp_")) out[key] = value;
  }
  return out;
};

const mergeVnpayIpnParams = (req) => {
  const out = pickVnpParams(req.query || {});
  if (req.body && typeof req.body === "object") {
    for (const [k, v] of Object.entries(req.body)) {
      if (!k.startsWith("vnp_")) continue;
      if (out[k] === undefined) out[k] = v;
    }
  }
  return out;
};

exports.vnpayIpn = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const params = mergeVnpayIpnParams(req);
    const vnp = getVnpayClient();
    const result = vnp.verifyIpnCall(params);

    if (!result.isVerified) {
      return res.status(200).json(IpnFailChecksum);
    }

    const orderId = result.vnp_TxnRef;
    const order = await Order.findById(orderId);
    if (!order || order.paymentMethod !== "vnpay") {
      return res.status(200).json(IpnOrderNotFound);
    }

    const expected = Math.round(Number(order.totalAmount) * 100);
    const received = Number(result.vnp_Amount);
    if (expected !== received) {
      return res.status(200).json(IpnInvalidAmount);
    }

    const ok =
      result.isSuccess && String(result.vnp_ResponseCode ?? "") === "00";
    if (ok) {
      if (order.paymentStatus === "paid") {
        return res.status(200).json(InpOrderAlreadyConfirmed);
      }
      await Order.findByIdAndUpdate(order._id, { paymentStatus: "paid" });
      await OrderStatusHistory.create({
        orderId: order._id,
        paymentStatus: "paid",
        note: "VNPay IPN xác nhận thanh toán",
      });
      if (order.voucherCode && !order.voucherConsumed) {
        try {
          await useVoucher({
            code: String(order.voucherCode).trim().toUpperCase(),
            userId: order.userId,
            guestId: order.guestId ? String(order.guestId).trim() : null,
            orderId: order._id,
          });
          await Order.findByIdAndUpdate(order._id, { voucherConsumed: true });
        } catch (vErr) {
          console.error("[VNPay IPN] useVoucher:", vErr?.message || vErr);
        }
      }
    }

    return res.status(200).json(IpnSuccess);
  } catch (err) {
    console.error("[VNPay IPN]", err?.message || err);
    return res.status(200).json(IpnUnknownError);
  }
};

const cancelUnpaidVnpayOrder = async (orderId) => {
  if (!orderId) return;
  const order = await Order.findById(orderId);
  if (!order) return;
  if (order.paymentMethod !== "vnpay") return;
  if (order.paymentStatus === "paid") return;
  if (order.status === "canceled") return;

  // Trả lại tồn Product khi thanh toán VNPay thất bại/hủy.
  for (const item of order.products || []) {
    if (!item?.quantity) continue;
    if (String(item.lineStatus || "active") === "canceled") continue;

    if (item.sku) {
      try {
        await restoreVariantStockBySku(item, item.quantity, null);
      } catch (_) {
        // Bỏ qua lỗi hoàn tồn để không block luồng hủy đơn VNPay.
      }
      continue;
    }

    try {
      const productDoc = await Product.findById(item.productId);
      if (productDoc && !productDoc.hasVariants) {
        productDoc.stock =
          Number(productDoc.stock || 0) + Number(item.quantity || 0);
        await productDoc.save();
      }
    } catch (_) {
      // ignore non-variant stock restore errors
    }
  }

  const update = { status: "canceled" };

  if (order.voucherCode && order.voucherConsumed) {
    await releaseVoucherForOrder({
      code: String(order.voucherCode).trim().toUpperCase(),
      orderId: order._id,
    });
  }
  if (order.voucherCode) {
    update.voucherCode = null;
    update.discount = 0;
    update.voucherConsumed = false;
  }

  await Order.findByIdAndUpdate(order._id, update);
};

// ================================================================
// VNPay: Return URL sau khi thanh toán (redirect từ VNPay)
// GET /api/order/return-payment?vnp_ResponseCode=00&vnp_TxnRef=...
// ================================================================
exports.returnPayment = async (req, res) => {
  try {
    const feUrl = process.env.FE_URL || "http://localhost:3000";
    const resolveSafeUrl = (raw, fallback) => {
      if (!raw) return fallback;
      try {
        const decoded = decodeURIComponent(String(raw));
        return decoded.startsWith("http://") || decoded.startsWith("https://")
          ? decoded
          : fallback;
      } catch {
        return fallback;
      }
    };

    const vnp = getVnpayClient();
    // VNPay có thể trả kèm query custom từ ReturnUrl (redirect/cancelRedirect...),
    // chỉ dùng nhóm tham số vnp_* để verify checksum.
    const result = vnp.verifyReturnUrl(pickVnpParams(req.query || {}));
    const orderId = result.vnp_TxnRef;
    const successUrl = resolveSafeUrl(
      req.query?.redirect,
      `${feUrl}/payment/return`,
    );
    const cancelUrl = resolveSafeUrl(
      req.query?.cancelRedirect,
      `${feUrl}/checkout`,
    );

    if (result.isVerified && result.isSuccess) {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== "paid") {
        await Order.findByIdAndUpdate(orderId, { paymentStatus: "paid" });
        await OrderStatusHistory.create({
          orderId,
          paymentStatus: "paid",
          note: "Thanh toán VNPay thành công",
        });
        if (order.voucherCode && !order.voucherConsumed) {
          try {
            await useVoucher({
              code: String(order.voucherCode).trim().toUpperCase(),
              userId: order.userId,
              guestId: order.guestId ? String(order.guestId).trim() : null,
              orderId: order._id,
            });
            await Order.findByIdAndUpdate(orderId, { voucherConsumed: true });
          } catch (vErr) {
            console.error(
              "[VNPay return] useVoucher:",
              vErr?.message || vErr,
            );
          }
        }
      }
      return res.redirect(`${successUrl}?success=1&orderId=${orderId}`);
    }

    await cancelUnpaidVnpayOrder(orderId);
    return res.redirect(`${cancelUrl}?success=0&orderId=${orderId}`);
  } catch (err) {
    try {
      const fallbackOrderId = req.query?.vnp_TxnRef;
      await cancelUnpaidVnpayOrder(fallbackOrderId);
    } catch (_) {
      // Ignore cleanup errors.
    }
    const feUrl = process.env.FE_URL || "http://localhost:3000";
    return res.redirect(`${feUrl}/payment/return?success=0&error=1`);
  }
};

// ================================================================
// User: Tạo yêu cầu hoàn hàng
// POST /api/order/:id/return-request
// ================================================================
const RETURN_REASON_RULES = {
  wrong_size: { label: "Sai size / không vừa", requireImage: false },
  wrong_item: { label: "Giao sai mẫu / sai màu", requireImage: true },
  defective: { label: "Lỗi sản xuất", requireImage: true },
  damaged_shipping: { label: "Hư hỏng khi vận chuyển", requireImage: true },
  not_as_described: { label: "Không đúng mô tả", requireImage: false },
  other: { label: "Lý do khác", requireImage: false },
};

exports.returnOrderRequest = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    const currentStatus = String(order.status || "").trim().toLowerCase();
    if (!["delivered", "received"].includes(currentStatus))
      return res
        .status(400)
        .json({
          message: "Chỉ đơn hàng đã giao/đã nhận mới được yêu cầu hoàn hàng",
        });
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 5) {
      return res
        .status(422)
        .json({ message: "Lý do hoàn hàng tối thiểu 5 ký tự" });
    }
    const returnWindowDays = Math.max(
      1,
      Number(process.env.RETURN_WINDOW_DAYS || 7),
    );
    const deliveredOrReceived = await OrderStatusHistory.findOne({
      orderId: order._id,
      newStatus: { $in: ["delivered", "received"] },
    }).sort({ createdAt: -1 });
    const baseDate = deliveredOrReceived?.createdAt || order.updatedAt || order.createdAt;
    if (baseDate) {
      const elapsedDays = (Date.now() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24);
      if (elapsedDays > returnWindowDays) {
        return res.status(400).json({
          message: `Đơn hàng đã quá thời hạn hoàn (${returnWindowDays} ngày)`,
        });
      }
    }
    const reasonCode = String(req.body?.reasonCode || "")
      .trim()
      .toLowerCase();
    const reasonRule = RETURN_REASON_RULES[reasonCode];
    if (!reasonRule) {
      return res.status(422).json({
        message: "Vui lòng chọn lý do hoàn hàng hợp lệ",
      });
    }
    const returnImagesRaw = Array.isArray(req.body?.images)
      ? req.body.images
      : [];
    const returnImages = returnImagesRaw
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 6);
    if (reasonRule.requireImage && returnImages.length === 0) {
      return res.status(422).json({
        message: `Lý do "${reasonRule.label}" yêu cầu ít nhất 1 ảnh minh chứng`,
      });
    }
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "return-request",
        returnRequestReason: reason,
        returnRequestReasonCode: reasonCode,
        returnRequestImages: returnImages,
      },
      { new: true },
    ).populate("products.productId");
    await OrderStatusHistory.create({
      oldStatus: currentStatus,
      newStatus: "return-request",
      orderId: order._id,
      reasonCode,
      note: reason,
      image: returnImages[0] || "",
      images: returnImages,
    });
    res.status(200).json(updated);
  } catch (err) {
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

// ================================================================
// Admin: Chấp nhận hoặc từ chối hoàn hàng
// ================================================================
exports.acceptOrRejectReturn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;
    const action = req.path.includes("accept") ? "accepted" : "rejected";
    const order = await Order.findById(id)
      .populate("products.productId")
      .session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    if (order.status !== "return-request") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Đơn hàng không ở trạng thái yêu cầu hoàn hàng" });
    }

    let walletPatch = {};
    // Nếu chấp nhận hoàn hàng: cộng lại tồn + hoàn tiền vào ví (nếu đủ điều kiện).
    if (action === "accepted") {
      await restoreStockForAcceptedReturn(order, session);
      walletPatch = await buildWalletRefundPatchForReturn(order, session);
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { status: action, ...walletPatch },
      { new: true, session },
    ).populate("products.productId");

    await OrderStatusHistory.create(
      [
        {
          oldStatus: "return-request",
          newStatus: action,
          orderId: order._id,
          note: req.body?.note || "",
        },
      ],
      { session },
    );
    await session.commitTransaction();
    session.endSession();
    res.status(200).json(updated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};
