const express = require("express");
const router = express.Router();
const ctrl = require("../controller/reviewController");
const { protect } = require("../middleware/auth");

// ── Public ───────────────────────────────────────────────────
router.get("/stats/:productId", ctrl.getStats); // GET  /api/reviews/stats/:productId
router.get("/", ctrl.getReviews); // GET  /api/reviews
router.get("/:id", ctrl.getReviewById); // GET  /api/reviews/:id
router.get("/:id/replies", ctrl.getReplies); // GET  /api/reviews/:id/replies

// ── Cần đăng nhập (protect middleware) ───────────────────────
router.use(protect);

router.post("/", ctrl.createReview); // POST   /api/reviews
router.patch("/:id", ctrl.updateReview); // PATCH  /api/reviews/:id
router.delete("/:id", ctrl.deleteReview); // DELETE /api/reviews/:id
router.patch("/:id/like", ctrl.toggleLike); // PATCH  /api/reviews/:id/like
router.patch("/:id/dislike", ctrl.toggleDislike); // PATCH  /api/reviews/:id/dislike
router.post("/:id/replies", ctrl.addReply); // POST   /api/reviews/:id/replies
router.delete("/:id/replies/:replyId", ctrl.deleteReply); // DELETE /api/reviews/:id/replies/:replyId

module.exports = router;
