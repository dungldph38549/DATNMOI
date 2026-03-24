const express = require("express");
const router = express.Router();
const VoucherController = require("../controllers/VoucherController");

// POST /api/voucher/create
router.post("/create", VoucherController.createVoucher);
// GET /api/voucher
router.get("/", VoucherController.getAllVouchers);
// GET /api/voucher/code/:code
router.get("/code/:code", VoucherController.getVoucherByCode);
// GET /api/voucher/:id
router.get("/:id", VoucherController.getVoucherDetail);
// PUT /api/voucher/:id
router.put("/:id", VoucherController.updateVoucher);
// DELETE /api/voucher/:id
router.delete("/:id", VoucherController.deleteVoucher);

module.exports = router;
