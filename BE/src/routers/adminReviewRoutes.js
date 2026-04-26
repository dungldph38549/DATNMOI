const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reviewController");
const { protect, restrictTo } = require("../middlewares/authMiddleware.js");

// Tất cả routes dưới đây đều yêu cầu đăng nhập + role admin
router.use(protect, restrictTo("admin"));

router.get("/reviews/stats-summary", ctrl.adminReviewStatsSummary); // GET /api/admin/reviews/stats-summary
router.get("/reviews/auto-reply-settings", ctrl.getReviewAutoReplySettings);
router.patch("/reviews/auto-reply-settings", ctrl.patchReviewAutoReplySettings);
router.get("/reviews", ctrl.adminGetReviews); // GET   /api/admin/reviews?status=pending
router.patch("/reviews/:id/approve", ctrl.approveReview); // PATCH /api/admin/reviews/:id/approve
router.patch("/reviews/:id/reject", ctrl.rejectReview); // PATCH /api/admin/reviews/:id/reject

module.exports = router;
