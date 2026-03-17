const express = require("express");
const router = express.Router();
const PC = require("../controllers/ProductController");

// Middleware auth (điều chỉnh đường dẫn theo dự án của bạn)
const {
  authMiddleware,
  authAdminMiddleware,
} = require("../middlewares/authMiddleware");

// ================================================================
// PUBLIC — Khách hàng không cần đăng nhập
// ================================================================

// Sản phẩm nổi bật (trang chủ)          GET /product/featured
router.get("/featured", PC.getFeaturedProducts);

// Hàng mới về                            GET /product/new-arrivals
router.get("/new-arrivals", PC.getNewArrivals);

// Bán chạy nhất                          GET /product/best-sellers
router.get("/best-sellers", PC.getBestSellers);

// Tìm kiếm                               GET /product/search?keyword=&limit=&page=
router.get("/search", PC.searchProducts);

// Lọc kết hợp brand + category + gender  GET /product/filter?brandId=&categoryId=&gender=
router.get("/filter", PC.getByBrandAndCategory);

// Sản phẩm theo danh mục                 GET /product/category/:categoryId
router.get("/category/:categoryId", PC.getProductsByCategory);

// Sản phẩm theo thương hiệu              GET /product/brand/:brandId
router.get("/brand/:brandId", PC.getByBrand);

// Kiểm tra tồn kho (giỏ hàng)           POST /product/get-stock
router.post("/get-stock", PC.getStock);

// Sản phẩm liên quan                     POST /product/relation
router.post("/relation", PC.relationProduct);

// Danh sách sản phẩm có filter + phân trang  POST /product/get-products
router.post("/get-products", PC.getProducts);

// Chi tiết sản phẩm                      GET /product/:id
router.get("/:id", PC.getProductById);

// ================================================================
// ADMIN — Yêu cầu đăng nhập + quyền admin
// ================================================================

// Lấy toàn bộ SP (bao gồm đã ẩn)        GET /product/admin/get-all
router.get("/admin/get-all", authAdminMiddleware, PC.getAllProducts);

// Tạo sản phẩm mới                       POST /product/create
router.post("/create", authAdminMiddleware, PC.createProduct);

// Upload ảnh chính                        POST /product/:id/upload-image
router.post("/:id/upload-image", authAdminMiddleware, PC.uploadImage);

// Cập nhật sản phẩm                      PUT /product/:id
router.put("/:id", authAdminMiddleware, PC.updateProduct);

// Soft delete (ẩn sản phẩm)             DELETE /product/:id
router.delete("/:id", authAdminMiddleware, PC.deleteProductById);

// Khôi phục sản phẩm đã ẩn              PATCH /product/:id/restore
router.patch("/:id/restore", authAdminMiddleware, PC.restoreProductById);

// Hard delete (xóa vĩnh viễn)           DELETE /product/:id/permanent
router.delete("/:id/permanent", authAdminMiddleware, PC.deleteProduct);

// Bật / tắt nổi bật                      PATCH /product/:id/toggle-featured
router.patch("/:id/toggle-featured", authAdminMiddleware, PC.toggleFeatured);

// Ẩn / hiện trên cửa hàng               PATCH /product/:id/toggle-visible
router.patch("/:id/toggle-visible", authAdminMiddleware, PC.toggleVisible);

module.exports = router;
