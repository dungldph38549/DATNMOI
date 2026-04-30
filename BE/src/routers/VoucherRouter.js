const express = require("express");
const router = express.Router();
const VoucherController = require("../controllers/VoucherController");
const {
  optionalAuthMiddleware,
  authAdminMiddleware,
} = require("../middlewares/authMiddleware");

// Thứ tự: route tĩnh trước /:id
router.get(
  "/admin",
  authAdminMiddleware,
  VoucherController.getAllVouchersAdmin,
);
router.post(
  "/apply",
  optionalAuthMiddleware,
  VoucherController.applyVoucher,
);
router.post(
  "/preview",
  optionalAuthMiddleware,
  VoucherController.previewVoucherDiscount,
);
router.post("/", authAdminMiddleware, VoucherController.createVoucher);
router.post("/create", authAdminMiddleware, VoucherController.createVoucher);
router.patch(
  "/:id/toggle",
  authAdminMiddleware,
  VoucherController.toggleVoucherActive,
);
router.get(
  "/code/:code",
  optionalAuthMiddleware,
  VoucherController.getVoucherByCode,
);
router.get(
  "/",
  optionalAuthMiddleware,
  VoucherController.getActiveVouchersPublic,
);
router.get(
  "/:id",
  optionalAuthMiddleware,
  VoucherController.getVoucherDetail,
);
router.put("/:id", authAdminMiddleware, VoucherController.updateVoucher);
router.delete("/:id", authAdminMiddleware, VoucherController.deleteVoucher);

module.exports = router;
