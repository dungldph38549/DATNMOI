const express = require("express");
const router = express.Router();
const RecommendController = require("../controllers/RecommendController");
const { optionalAuthMiddleware } = require("../middlewares/authMiddleware");

router.get(
  "/trending",
  optionalAuthMiddleware,
  RecommendController.getTrending,
);
router.get(
  "/by-product/:productId",
  optionalAuthMiddleware,
  RecommendController.getByProduct,
);
router.get("/", optionalAuthMiddleware, RecommendController.getRecommend);

module.exports = router;
