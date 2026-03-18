const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/CategoryController");
const {
  authAdminMiddleware,
  authStaffMiddleware,
} = require("../middlewares/authMiddleware");

// ================================================================
// PUBLIC ROUTES
// ================================================================

/**
 * GET /category
 * GET /category?status=all        ← admin dùng (getAllCategories("all"))
 * GET /category?status=inactive
 * Mặc định chỉ trả về status=active cho khách hàng
 */
router.get("/", CategoryController.getAll);

/**
 * GET /category/:id
 * Lấy chi tiết 1 danh mục theo ID
 */
router.get("/:id", CategoryController.getOne);

// ================================================================
// ADMIN ROUTES (yêu cầu xác thực)
// ================================================================

/**
 * POST /category/admin/create
 * Body: { name, image?, status?, slug?, description?, seoTitle?, seoDescription? }
 * Tạo danh mục mới
 */
router.post("/admin/create", authStaffMiddleware, CategoryController.create);

/**
 * PUT /category/admin/update
 * Body: { id, name?, image?, status?, slug?, description?, seoTitle?, seoDescription? }
 * Cập nhật danh mục
 */
router.put("/admin/update", authStaffMiddleware, CategoryController.update);

/**
 * DELETE /category/admin/delete
 * Body: { ids: ["id1", "id2"] }
 * Xoá cứng nhiều danh mục
 */
router.delete("/admin/delete", authAdminMiddleware, CategoryController.delete);

module.exports = router;
