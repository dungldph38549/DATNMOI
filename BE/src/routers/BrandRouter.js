const express = require("express");
const router = express.Router();
const BrandController = require("../controllers/BrandController");
const {
  authAdminMiddleware,
  authStaffMiddleware,
} = require("../middlewares/authMiddleware");

// ================================================================
// PUBLIC ROUTES
// ================================================================

// GET /api/brand - Lấy tất cả thương hiệu
router.get("/", BrandController.getAllBrands);

// GET /api/brand/:id - Lấy chi tiết thương hiệu
router.get("/:id", BrandController.getBrandDetail);

// ================================================================
// ADMIN ROUTES (yêu cầu xác thực)
// ================================================================

// GET /api/brand/admin/detail/:id - Lấy chi tiết thương hiệu (admin)
router.get("/admin/detail/:id", BrandController.getBrandDetail);

// POST /api/brand/admin/create - Tạo thương hiệu mới
router.post("/admin/create", authStaffMiddleware, BrandController.createBrand);

// PUT /api/brand/admin/update - Cập nhật thương hiệu
router.put("/admin/update", authStaffMiddleware, BrandController.updateBrand);

// DELETE /api/brand/admin/delete - Xóa nhiều thương hiệu (body: { ids: [...] })
router.delete(
  "/admin/delete",
  authAdminMiddleware,
  BrandController.deleteBrands,
);

module.exports = router;
