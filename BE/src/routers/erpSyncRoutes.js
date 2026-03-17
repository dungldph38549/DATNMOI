const express = require("express");
const router = express.Router();
const { authAdminMiddleware } = require("../middlewares/authMiddleware");

// Webhook: public (dùng signature verify thay vì JWT)
router.post("/erp/webhook", exports.webhook);

// Admin only
router.use(authAdminMiddleware);
router.post("/erp/pull", exports.pullAll); // POST /api/sync/erp/pull
router.post("/erp/pull/:sku", exports.pullSku); // POST /api/sync/erp/pull/:sku

module.exports = router;
