const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/inventoryController");
const {
  authMiddleware,
  authAdminMiddleware,
} = require("../middlewares/authMiddleware.js");

// ── Public (hoặc internal service-to-service) ─────────────────
router.get("/low-stock", ctrl.getLowStock); // GET  /api/inventory/low-stock
router.get("/sku/:sku", ctrl.getBySku); // GET  /api/inventory/sku/:sku
router.get("/", ctrl.getByProduct); // GET  /api/inventory?productId=

// ── Cần đăng nhập ─────────────────────────────────────────────
router.use(authMiddleware);

router.get("/:id", ctrl.getById); // GET  /api/inventory/:id
router.get("/:id/logs", ctrl.getAuditLogs); // GET  /api/inventory/:id/logs

// Reserve / Release — user khi đặt và hủy đơn
router.post("/:id/reserve", ctrl.reserve); // POST /api/inventory/:id/reserve
router.post("/:id/release", ctrl.release); // POST /api/inventory/:id/release

// ── Chỉ Admin ─────────────────────────────────────────────────
router.use(authAdminMiddleware);

router.post("/", ctrl.create); // POST   /api/inventory
router.post("/:id/import", ctrl.import); // POST   /api/inventory/:id/import
router.post("/:id/export", ctrl.export); // POST   /api/inventory/:id/export
router.patch("/:id/adjust", ctrl.adjust); // PATCH  /api/inventory/:id/adjust
router.post("/:id/transfer", ctrl.transfer); // POST   /api/inventory/:id/transfer

module.exports = router;
