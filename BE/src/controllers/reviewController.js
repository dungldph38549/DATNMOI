const reviewService = require("../services/ReviewService");

const getRequestUserId = (req) =>
  req?.user?._id || req?.user?.id || req?.user?.userId || null;

// ── Helper: gửi lỗi theo status ─────────────────────────────
const handleError = (res, err) => {
  const status = err.status || 500;
  return res.status(status).json({
    status: "ERR",
    message: err.message || "Internal server error",
  });
};

// ══════════════════════════════════════════════════════════════
//  PUBLIC
// ══════════════════════════════════════════════════════════════

const getStats = async (req, res) => {
  try {
    const data = await reviewService.getStats(req.params.productId);
    return res.status(200).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const getReviews = async (req, res) => {
  try {
    const data = await reviewService.getReviews(req.query);
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const getReviewById = async (req, res) => {
  try {
    const data = await reviewService.getReviewById(req.params.id);
    return res.status(200).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const getReplies = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const data = await reviewService.getReplies(req.params.id, page, limit);
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

// ══════════════════════════════════════════════════════════════
//  USER (cần đăng nhập)
// ══════════════════════════════════════════════════════════════

const getMyReview = async (req, res) => {
  try {
    const data = await reviewService.getMyReview(req.query, req.user);
    return res.status(200).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const getEligibleReviewOrders = async (req, res) => {
  try {
    const data = await reviewService.getEligibleReviewOrders(req.query, req.user);
    return res.status(200).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const createReview = async (req, res) => {
  try {
    const data = await reviewService.createReview(req.body, req.user);
    return res.status(201).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const updateReview = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const data = await reviewService.updateReview(
      req.params.id,
      req.body,
      userId,
    );
    return res.status(200).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const deleteReview = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const data = await reviewService.deleteReview(
      req.params.id,
      userId,
      req.user.role,
    );
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const toggleLike = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const data = await reviewService.toggleLike(req.params.id, userId);
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const toggleDislike = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const data = await reviewService.toggleDislike(req.params.id, userId);
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const addReply = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const data = await reviewService.addReply(
      req.params.id,
      req.body,
      userId,
      req.user.role,
    );
    return res.status(201).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const deleteReply = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const data = await reviewService.deleteReply(
      req.params.id,
      req.params.replyId,
      userId,
      req.user.role,
    );
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

// ══════════════════════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════════════════════

const adminGetReviews = async (req, res) => {
  try {
    const data = await reviewService.adminGetReviews(req.query);
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const adminReviewStatsSummary = async (req, res) => {
  try {
    const data = await reviewService.adminReviewTotalCount();
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const getReviewAutoReplySettings = async (req, res) => {
  try {
    const data = await reviewService.getReviewAutoReplySettings();
    return res.status(200).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const patchReviewAutoReplySettings = async (req, res) => {
  try {
    const data = await reviewService.updateReviewAutoReplySettings(req.body);
    return res.status(200).json({ status: "OK", data });
  } catch (e) {
    return handleError(res, e);
  }
};

const approveReview = async (req, res) => {
  try {
    const data = await reviewService.approveReview(req.params.id);
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

const rejectReview = async (req, res) => {
  try {
    const data = await reviewService.rejectReview(
      req.params.id,
      req.body.reason,
    );
    return res.status(200).json({ status: "OK", ...data });
  } catch (e) {
    return handleError(res, e);
  }
};

module.exports = {
  getStats,
  getReviews,
  getReviewById,
  getReplies,
  getMyReview,
  getEligibleReviewOrders,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
  toggleDislike,
  addReply,
  deleteReply,
  adminGetReviews,
  adminReviewStatsSummary,
  getReviewAutoReplySettings,
  patchReviewAutoReplySettings,
  approveReview,
  rejectReview,
};
