// ================================================================
// services/reviewService.js
// Toàn bộ business logic — controller chỉ đọc req/res
// ================================================================
const Review = require("../models/Review");
const ReviewAutoReplySettings = require("../models/ReviewAutoReplySettings");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const mongoose = require("mongoose");

const attrEntries = (attrs) => {
  if (!attrs || typeof attrs !== "object") return [];
  return typeof attrs.entries === "function"
    ? [...attrs.entries()]
    : Object.entries(attrs);
};

/** Chuỗi phân loại từ dòng sản phẩm trong đơn (SKU + thuộc tính). */
const buildVariantLabelFromLine = (line) => {
  if (!line) return null;
  const parts = [];
  if (line.sku) parts.push(`SKU ${String(line.sku).trim()}`);
  const attrs = line.attributes;
  for (const [k, v] of attrEntries(attrs)) {
    if (v != null && String(v).trim() !== "")
      parts.push(`${k}: ${String(v).trim()}`);
  }
  return parts.length ? parts.join(" · ") : null;
};

/** Chuỗi "Key: Val · …" từ attributes (đơn hoặc biến thể SKU). */
const buildOrderedVariantTextFromAttrs = (attrs) => {
  if (!attrs) return null;
  const parts = [];
  for (const [k, v] of attrEntries(attrs)) {
    if (v != null && String(v).trim() !== "")
      parts.push(`${String(k).trim()}: ${String(v).trim()}`);
  }
  return parts.length ? parts.join(" · ") : null;
};

const buildOrderedVariantTextFromLine = (line) =>
  buildOrderedVariantTextFromAttrs(line?.attributes);

const orderedVariantFromProductSku = (prod, orderLine) => {
  const sku = orderLine?.sku ? String(orderLine.sku).trim().toUpperCase() : "";
  const variants = Array.isArray(prod?.variants) ? prod.variants : [];
  if (!sku || !variants.length) return null;
  const v = variants.find((x) => String(x?.sku || "").toUpperCase() === sku);
  return buildOrderedVariantTextFromAttrs(v?.attributes);
};

const COLOR_KEY_RE = /^(color|colour|màu|mau)$/i;
const SIZE_KEY_RE =
  /^(size|sizes|kích\s*cỡ|kich\s*co|eu|length|width|độ\s*dài|do\s*dai)$/i;

const extractColorFromAttrs = (attrs) => {
  if (!attrs) return null;
  for (const [k, v] of attrEntries(attrs)) {
    if (COLOR_KEY_RE.test(String(k).trim()) && v != null && String(v).trim())
      return String(v).trim();
  }
  return null;
};

/** Ưu tiên key gợi ý size; sau đó lấy thuộc tính đầu tiên không phải màu (thường là size trong shop giày). */
const extractSizeFromAttrs = (attrs) => {
  if (!attrs) return null;
  for (const [k, v] of attrEntries(attrs)) {
    const key = String(k).trim();
    if (SIZE_KEY_RE.test(key) && v != null && String(v).trim())
      return String(v).trim();
  }
  for (const [k, v] of attrEntries(attrs)) {
    if (COLOR_KEY_RE.test(String(k).trim())) continue;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
};

/** Size / màu từ dòng đơn; bổ sung từ biến thể theo SKU nếu thiếu. */
const resolvePurchaseSizeColor = (prod, orderLine) => {
  const orderAttrs = orderLine?.attributes;
  let purchaseSize = extractSizeFromAttrs(orderAttrs);
  let purchaseColor = extractColorFromAttrs(orderAttrs);

  const sku = orderLine?.sku ? String(orderLine.sku).trim().toUpperCase() : "";
  const variants = Array.isArray(prod?.variants) ? prod.variants : [];
  const v =
    sku && variants.length
      ? variants.find((x) => String(x?.sku || "").toUpperCase() === sku)
      : null;

  if (v?.attributes) {
    const va = v.attributes;
    if (!purchaseSize) purchaseSize = extractSizeFromAttrs(va);
    if (!purchaseColor) purchaseColor = extractColorFromAttrs(va);
  }

  return { purchaseSize, purchaseColor };
};

const productPopulateForReview = {
  path: "productId",
  select:
    "name image srcImages slug brandId categoryId price shortDescription description variants hasVariants",
  populate: [
    { path: "brandId", select: "name" },
    { path: "categoryId", select: "name" },
  ],
};

const orderPopulateForReview = { path: "orderId", select: "status" };

const toId = (id) => new mongoose.Types.ObjectId(id);
const isValid = (id) => mongoose.isValidObjectId(id);
/** Mỗi lần mua (đơn đã giao / đã nhận) → một đánh giá / sản phẩm. */
const REVIEW_ELIGIBLE_ORDER_STATUSES = ["delivered", "received"];

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── GET /api/reviews ─────────────────────────────────────────
const getReviews = async ({
  productId,
  page = 1,
  limit = 10,
  rating,
  verified,
  sort = "newest",
}) => {
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");

  const filter = {
    productId: toId(productId),
    isDeleted: false,
    status: "approved",
  };
  if (rating) filter.rating = Number(rating);
  if (verified) filter.verifiedPurchase = true;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    highest: { rating: -1 },
    lowest: { rating: 1 },
  };

  const [reviews, total, stats] = await Promise.all([
    Review.find(filter)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate("userId", "name avatar")
      .populate(productPopulateForReview)
      .populate(orderPopulateForReview)
      .populate("replies.userId", "name avatar")
      .lean({ virtuals: true }),
    Review.countDocuments(filter),
    Review.getStats(productId),
  ]);

  reviews.forEach((r) => {
    r.replies = r.replies?.filter((rp) => !rp.isDeleted) ?? [];
  });

  return {
    reviews,
    meta: {
      total,
      page: +page,
      limit: +limit,
      pages: Math.ceil(total / limit),
    },
    stats,
  };
};

// ── GET /api/reviews/:id ─────────────────────────────────────
const getReviewById = async (id) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({ _id: id, isDeleted: false })
    .populate("userId", "name avatar")
    .populate("replies.userId", "name avatar")
    .lean({ virtuals: true });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  review.replies = review.replies?.filter((r) => !r.isDeleted) ?? [];
  return review;
};

// ── GET /api/reviews/mine?productId=...&orderId=...&all=1 ───
const getMyReview = async ({ productId, orderId, all }, userId) => {
  const resolvedUserId = userId?._id || userId?.id || userId;
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  if (!isValid(resolvedUserId)) throw new AppError("userId không hợp lệ");
  const base = {
    productId: toId(productId),
    userId: toId(resolvedUserId),
    isDeleted: false,
  };
  if (all === "1" || all === "true" || all === true) {
    const list = await Review.find(base)
      .sort({ createdAt: -1 })
      .populate("userId", "name avatar")
      .populate(productPopulateForReview)
      .populate(orderPopulateForReview)
      .lean({ virtuals: true });
    return list;
  }
  if (orderId && isValid(orderId)) {
    const review = await Review.findOne({
      ...base,
      orderId: toId(orderId),
    })
      .populate("userId", "name avatar")
      .populate(productPopulateForReview)
      .populate(orderPopulateForReview)
      .lean({ virtuals: true });
    return review || null;
  }
  const review = await Review.findOne(base)
    .sort({ createdAt: -1 })
    .populate("userId", "name avatar")
    .populate(productPopulateForReview)
    .populate(orderPopulateForReview)
    .lean({ virtuals: true });
  return review || null;
};

// ── GET /api/reviews/eligible-orders?productId=... ───────────
const getEligibleReviewOrders = async ({ productId }, user) => {
  const userId = user?._id || user?.id || user;
  const normalizedEmail = String(user?.email || "")
    .trim()
    .toLowerCase();
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  if (!isValid(userId)) throw new AppError("userId không hợp lệ");

  const purchaseOr = [{ userId: toId(userId) }];
  if (normalizedEmail) {
    const escapedEmail = String(user.email)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    purchaseOr.push({ email: { $regex: `^${escapedEmail}$`, $options: "i" } });
  }
  const orders = await Order.find({
    $or: purchaseOr,
    status: { $in: REVIEW_ELIGIBLE_ORDER_STATUSES },
    products: { $elemMatch: { productId: toId(productId) } },
  })
    .sort({ createdAt: -1 })
    .select("_id createdAt status")
    .lean();

  const eligible = [];
  for (const o of orders) {
    if (
      !(await Review.hasReviewedOrder(userId, toId(productId), o._id))
    ) {
      eligible.push({
        orderId: o._id,
        createdAt: o.createdAt,
        status: o.status,
      });
    }
  }
  return { eligible };
};

// ── POST /api/reviews ────────────────────────────────────────
const createReview = async (
  { productId, rating, title, content, images, orderId },
  user,
) => {
  const userId = user?._id || user?.id || user;
  const normalizedEmail = String(user?.email || "")
    .trim()
    .toLowerCase();
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  if (!isValid(userId)) throw new AppError("userId không hợp lệ");
  if (!rating || rating < 1 || rating > 5)
    throw new AppError("Rating phải từ 1 đến 5");
  if (!orderId || !isValid(orderId))
    throw new AppError(
      "Vui lòng chọn lần mua (đơn đã giao / đã nhận hàng). Mỗi lần mua được đánh giá một lần cho sản phẩm.",
      400,
    );

  const matchedOrder = await Order.findOne({
    _id: toId(orderId),
    status: { $in: REVIEW_ELIGIBLE_ORDER_STATUSES },
    products: { $elemMatch: { productId: toId(productId) } },
  })
    .select("_id userId email products")
    .lean();
  if (!matchedOrder)
    throw new AppError(
      "Lần mua không hợp lệ: cần đơn đã giao hoặc đã nhận hàng và có sản phẩm này.",
      422,
    );
  const orderOwnerId = matchedOrder?.userId ? String(matchedOrder.userId) : "";
  const orderEmail = String(matchedOrder?.email || "")
    .trim()
    .toLowerCase();
  const isOrderOwner =
    (orderOwnerId && orderOwnerId === String(userId)) ||
    (normalizedEmail && orderEmail && normalizedEmail === orderEmail);
  if (!isOrderOwner) {
    throw new AppError("Bạn không có quyền đánh giá từ đơn hàng này", 403);
  }

  const verifiedOrderId = matchedOrder._id;

  if (
    await Review.hasReviewedOrder(
      userId,
      toId(productId),
      verifiedOrderId,
    )
  )
    throw new AppError(
      "Bạn đã đánh giá sản phẩm này cho lần mua này rồi.",
      409,
    );

  const orderLine = (matchedOrder.products || []).find(
    (p) => String(p.productId) === String(productId),
  );
  const variantLabel = buildVariantLabelFromLine(orderLine);

  let productSnapshot = null;
  try {
    const prod = await Product.findById(productId)
      .select(
        "name image srcImages brandId categoryId price shortDescription variants",
      )
      .populate("brandId", "name")
      .populate("categoryId", "name")
      .lean();
    if (prod) {
      const img =
        prod.image ||
        (Array.isArray(prod.srcImages) && prod.srcImages[0]) ||
        null;
      const linePrice =
        orderLine?.price != null ? Number(orderLine.price) : null;
      const { purchaseSize, purchaseColor } = resolvePurchaseSizeColor(
        prod,
        orderLine,
      );
      const orderedVariantText =
        buildOrderedVariantTextFromLine(orderLine) ||
        orderedVariantFromProductSku(prod, orderLine);
      productSnapshot = {
        name: prod.name ?? null,
        image: img,
        brandName: prod.brandId?.name ?? null,
        categoryName: prod.categoryId?.name ?? null,
        price:
          linePrice != null && Number.isFinite(linePrice)
            ? linePrice
            : prod.price != null
              ? Number(prod.price)
              : null,
        shortDescription: prod.shortDescription ?? null,
        purchaseSize: purchaseSize ?? null,
        purchaseColor: purchaseColor ?? null,
        orderedVariantText: orderedVariantText ?? null,
      };
    }
  } catch (_) {
    productSnapshot = null;
  }

  let review;
  try {
    review = await Review.create({
      productId,
      userId,
      rating,
      title: title?.trim() || null,
      content: content?.trim() || null,
      images: images || [],
      orderId: verifiedOrderId,
      status: "approved",
      verifiedPurchase: true,
      variantLabel,
      productSnapshot,
    });
  } catch (e) {
    if (e?.code === 11000) {
      const dup = String(e?.message || "");
      if (dup.includes("productId_1_userId_1")) {
        throw new AppError(
          "Cơ sở dữ liệu vẫn dùng index cũ. Hãy khởi động lại backend (server sẽ tự xóa index productId_1_userId_1), sau đó thử gửi đánh giá lại.",
          503,
        );
      }
      throw new AppError(
        "Đánh giá trùng cho lần mua này hoặc xung đột dữ liệu. Thử lại sau hoặc liên hệ hỗ trợ.",
        409,
      );
    }
    throw e;
  }
  await review.populate("userId", "name avatar");
  const rid = review._id;
  setImmediate(() => {
    tryAutoReplyAfterReviewCreate(rid).catch((err) => {
      console.error("tryAutoReplyAfterReviewCreate:", err?.message || err);
    });
  });
  return review;
};

const getReviewAutoReplySettings = async () => {
  const doc = await ReviewAutoReplySettings.getSingleton();
  return {
    autoReplyEnabled: !!doc.autoReplyEnabled,
    autoReplyMessage: doc.autoReplyMessage || "",
  };
};

const updateReviewAutoReplySettings = async (body = {}) => {
  const enabled = !!body.autoReplyEnabled;
  let messageText = String(body.autoReplyMessage ?? "").trim();
  if (messageText.length > 500) messageText = messageText.slice(0, 500);
  const doc = await ReviewAutoReplySettings.findOneAndUpdate(
    {},
    {
      $set: {
        autoReplyEnabled: enabled,
        autoReplyMessage: messageText,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return {
    autoReplyEnabled: !!doc.autoReplyEnabled,
    autoReplyMessage: doc.autoReplyMessage || "",
  };
};

const tryAutoReplyAfterReviewCreate = async (reviewId) => {
  if (!isValid(reviewId)) return;
  const settings = await ReviewAutoReplySettings.getSingleton();
  if (!settings.autoReplyEnabled) return;
  const msg = String(settings.autoReplyMessage || "").trim();
  if (!msg) return;

  let adminUserId = null;
  const envId = process.env.REVIEW_AUTO_REPLY_USER_ID;
  if (envId && mongoose.isValidObjectId(envId)) {
    const exists = await User.findById(envId).select("_id").lean();
    if (exists) adminUserId = exists._id;
  }
  if (!adminUserId) {
    const u = await User.findOne({ role: "admin" })
      .sort({ createdAt: 1 })
      .select("_id")
      .lean();
    adminUserId = u?._id;
  }
  if (!adminUserId) return;

  const fresh = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!fresh) return;
  const reps = Array.isArray(fresh.replies) ? fresh.replies : [];
  if (reps.some((r) => r && !r.isDeleted && r.role === "admin")) return;

  await addReply(reviewId, { content: msg }, adminUserId, "admin");
};

// ── PATCH /api/reviews/:id ───────────────────────────────────
const updateReview = async (id, body, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({ _id: id, isDeleted: false });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  if (review.userId.toString() !== userId.toString())
    throw new AppError("Bạn không có quyền chỉnh sửa review này", 403);
  await review.editReview(
    { rating: body.rating, content: body.content, title: body.title },
    3,
  );
  await review.populate("userId", "name avatar");
  return review;
};

// ── DELETE /api/reviews/:id ──────────────────────────────────
const deleteReview = async (id, userId, userRole) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({ _id: id, isDeleted: false });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  if (review.userId.toString() !== userId.toString() && userRole !== "admin")
    throw new AppError("Bạn không có quyền xoá review này", 403);
  await review.softDelete(userId);
  return { id, deleted: true };
};

// ── PATCH /api/reviews/:id/like ──────────────────────────────
const toggleLike = async (id, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({
    _id: id,
    isDeleted: false,
    status: "approved",
  });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  await review.toggleLike(userId);
  return {
    likeCount: review.likes.length,
    dislikeCount: review.dislikes.length,
  };
};

// ── PATCH /api/reviews/:id/dislike ───────────────────────────
const toggleDislike = async (id, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({
    _id: id,
    isDeleted: false,
    status: "approved",
  });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  await review.toggleDislike(userId);
  return {
    likeCount: review.likes.length,
    dislikeCount: review.dislikes.length,
  };
};

// ── GET /api/reviews/:id/replies ─────────────────────────────
const getReplies = async (reviewId, page = 1, limit = 5) => {
  if (!isValid(reviewId)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({
    _id: reviewId,
    isDeleted: false,
  }).populate("replies.userId", "name avatar");
  if (!review) throw new AppError("Không tìm thấy review", 404);
  return review.getRepliesPaginated(+page, +limit);
};

// ── POST /api/reviews/:id/replies ────────────────────────────
const addReply = async (reviewId, { content }, userId, userRole) => {
  if (!isValid(reviewId)) throw new AppError("ID không hợp lệ");
  if (!content?.trim())
    throw new AppError("Nội dung reply không được để trống");
  if (content.length > 500)
    throw new AppError("Reply không được vượt quá 500 ký tự");
  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  await review.addReply({ userId, role: userRole, content: content.trim() });
  await review.populate("replies.userId", "name avatar");
  return review.getRepliesPaginated(1, 5);
};

// ── DELETE /api/reviews/:id/replies/:replyId ─────────────────
const deleteReply = async (reviewId, replyId, userId, userRole) => {
  if (!isValid(reviewId) || !isValid(replyId))
    throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  const reply = review.replies.id(replyId);
  if (!reply || reply.isDeleted)
    throw new AppError("Không tìm thấy reply", 404);
  if (reply.userId?.toString() !== userId.toString() && userRole !== "admin")
    throw new AppError("Bạn không có quyền xoá reply này", 403);
  await review.softDeleteReply(replyId);
  return { replyId, deleted: true };
};

// ── GET /api/reviews/stats/:productId ────────────────────────
const getStats = async (productId) => {
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  return Review.getStats(productId);
};

// ── [ADMIN] GET /api/admin/reviews/stats-summary ─────────────
const adminReviewTotalCount = async () => {
  const totalReviews = await Review.countDocuments({ isDeleted: false });
  return { totalReviews };
};

// ── [ADMIN] GET /api/admin/reviews ───────────────────────────
const adminGetReviews = async ({ page = 1, limit = 20, status, productId }) => {
  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (productId && isValid(productId)) filter.productId = toId(productId);
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate("userId", "name email avatar")
      .populate(productPopulateForReview)
      .populate(orderPopulateForReview)
      .lean({ virtuals: true }),
    Review.countDocuments(filter),
  ]);
  return {
    reviews,
    meta: {
      total,
      page: +page,
      limit: +limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// ── [ADMIN] PATCH /api/admin/reviews/:id/approve ─────────────
const approveReview = async (id) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({ _id: id, isDeleted: false });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  await review.approve();
  return { id, status: "approved" };
};

// ── [ADMIN] PATCH /api/admin/reviews/:id/reject ───────────────
const rejectReview = async (id, reason) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const review = await Review.findOne({ _id: id, isDeleted: false });
  if (!review) throw new AppError("Không tìm thấy review", 404);
  await review.reject(reason);
  return { id, status: "rejected", reason };
};

module.exports = {
  getReviews,
  getReviewById,
  getMyReview,
  getEligibleReviewOrders,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
  toggleDislike,
  getReplies,
  addReply,
  deleteReply,
  getStats,
  approveReview,
  rejectReview,
  adminGetReviews,
  adminReviewTotalCount,
  getReviewAutoReplySettings,
  updateReviewAutoReplySettings,
};
