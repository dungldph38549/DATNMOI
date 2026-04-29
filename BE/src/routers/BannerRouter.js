const express = require("express");
const BannerController = require("../controllers/BannerController");
const {
  authStaffMiddleware,
  authAdminMiddleware,
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", BannerController.getPublicBanners);
router.get("/admin", authStaffMiddleware, BannerController.getAllBannersAdmin);
router.post("/", authStaffMiddleware, BannerController.createBanner);
router.put("/:id", authStaffMiddleware, BannerController.updateBanner);
router.delete("/:id", authAdminMiddleware, BannerController.deleteBanner);
router.patch("/:id/toggle", authStaffMiddleware, BannerController.toggleBanner);
router.patch("/reorder", authStaffMiddleware, BannerController.reorderBanners);

module.exports = router;
