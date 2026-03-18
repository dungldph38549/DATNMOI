// ================================================================
// services/reviewService.js
// Toàn bộ business logic — controller chỉ đọc req/res
// ================================================================
const Review = require("../models/Review");
const mongoose = require("mongoose");

const toId = (id) => new mongoose.Types.ObjectId(id);
const isValid = (id) => mongoose.isValidObjectId(id);

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

// ── POST /api/reviews ────────────────────────────────────────
const createReview = async (
  { productId, rating, title, content, images, orderId },
  userId,
) => {
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  if (!rating || rating < 1 || rating > 5)
    throw new AppError("Rating phải từ 1 đến 5");

  await Review.checkRateLimit(userId, 5);

  if (await Review.hasReviewed(userId, productId))
    throw new AppError("Bạn đã đánh giá sản phẩm này rồi", 409);

  const review = await Review.create({
    productId,
    userId,
    rating,
    title: title?.trim() || null,
    content: content?.trim() || null,
    images: images || [],
    orderId: orderId || null,
  });
  await review.populate("userId", "name avatar");
  return review;
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
      .populate("productId", "name")
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
};
