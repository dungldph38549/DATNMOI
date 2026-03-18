const express = require("express");
const router = express.Router();
// 1. Chỉ require controller một lần duy nhất
const warehouseController = require("../controllers/warehouseController");

// 2. Chỉ require middleware một lần duy nhất
const {
  authMiddleware,
  authAdminMiddleware,
} = require("../middlewares/authMiddleware");

// ==========================================
// 1. CÁC ROUTE CHO NHÂN VIÊN/USER (CẦN LOGIN)
// ==========================================
router.get("/", authMiddleware, warehouseController.getAll);
router.get("/:id", authMiddleware, warehouseController.getById);
router.get("/:id/stock", authMiddleware, warehouseController.getWarehouseStock);

// ==========================================
// 2. CÁC ROUTE CHỈ DÀNH CHO ADMIN
// ==========================================
// Mọi route nằm phía dưới dòng này đều sẽ bắt buộc phải là Admin
router.use(authAdminMiddleware);

router.post("/", warehouseController.create);
router.patch("/:id", warehouseController.update);
router.delete("/:id", warehouseController.deactivate);

module.exports = router;
