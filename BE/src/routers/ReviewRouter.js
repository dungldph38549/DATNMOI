const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reviewController");
const { protect } = require("../middlewares/authMiddleware.js");

// ── Public ───────────────────────────────────────────────────
router.get("/stats/:productId", ctrl.getStats); // GET  /api/reviews/stats/:productId
router.get("/", ctrl.getReviews); // GET  /api/reviews

// ── Cần đăng nhập (protect middleware) ───────────────────────
router.get("/mine", protect, ctrl.getMyReview); // GET /api/reviews/mine?productId=...

router.post("/", protect, ctrl.createReview); // POST   /api/reviews
router.patch("/:id", protect, ctrl.updateReview); // PATCH  /api/reviews/:id
router.delete("/:id", protect, ctrl.deleteReview); // DELETE /api/reviews/:id
router.patch("/:id/like", protect, ctrl.toggleLike); // PATCH  /api/reviews/:id/like
router.patch("/:id/dislike", protect, ctrl.toggleDislike); // PATCH  /api/reviews/:id/dislike
router.post("/:id/replies", protect, ctrl.addReply); // POST   /api/reviews/:id/replies
router.delete("/:id/replies/:replyId", protect, ctrl.deleteReply); // DELETE /api/reviews/:id/replies/:replyId

// Public detail routes đặt sau /mine để tránh conflict path
router.get("/:id/replies", ctrl.getReplies); // GET  /api/reviews/:id/replies
router.get("/:id", ctrl.getReviewById); // GET  /api/reviews/:id

module.exports = router;
