const express = require("express");
const router = express.Router();
const ctrl = require("../controller/reviewController");
const { protect, restrictTo } = require("../middleware/auth");

// Tất cả routes dưới đây đều yêu cầu đăng nhập + role admin
router.use(protect, restrictTo("admin"));

router.get("/reviews", ctrl.adminGetReviews); // GET   /api/admin/reviews?status=pending
router.patch("/reviews/:id/approve", ctrl.approveReview); // PATCH /api/admin/reviews/:id/approve
router.patch("/reviews/:id/reject", ctrl.rejectReview); // PATCH /api/admin/reviews/:id/reject

module.exports = router;
