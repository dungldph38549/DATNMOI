const express = require("express");
const router = express.Router();
const VoucherController = require("../controllers/VoucherController");
const { optionalAuthMiddleware } = require("../middlewares/authMiddleware");

// POST /api/voucher/create
router.post("/create", VoucherController.createVoucher);
// POST /api/voucher/preview — tính tiền giảm (không lộ trần giảm cho client)
router.post("/preview", optionalAuthMiddleware, VoucherController.previewVoucherDiscount);
// GET /api/voucher
router.get("/", optionalAuthMiddleware, VoucherController.getAllVouchers);
// GET /api/voucher/code/:code
router.get("/code/:code", optionalAuthMiddleware, VoucherController.getVoucherByCode);
// GET /api/voucher/:id
router.get("/:id", optionalAuthMiddleware, VoucherController.getVoucherDetail);
// PUT /api/voucher/:id
router.put("/:id", VoucherController.updateVoucher);
// DELETE /api/voucher/:id
router.delete("/:id", VoucherController.deleteVoucher);

module.exports = router;
