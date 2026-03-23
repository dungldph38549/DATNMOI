const express = require("express");
const router = express.Router();
const PC = require("../controllers/ProductController");

const {
  authMiddleware,
  authAdminMiddleware,
  authStaffMiddleware,
} = require("../middlewares/authMiddleware");

// Dev mode: bỏ qua auth nếu ALLOW_GUEST_ADMIN=true trong .env
const adminGuard =
  process.env.ALLOW_GUEST_ADMIN === "true"
    ? (req, _res, next) => next()
    : authStaffMiddleware;

// ================================================================
// PUBLIC
// ================================================================
router.get("/", (req, res) => {
  res.status(200).json({ message: "Product API đang chạy" });
});

router.get("/featured", PC.getFeaturedProducts);
router.get("/new-arrivals", PC.getNewArrivals);
router.get("/best-sellers", PC.getBestSellers);
router.get("/search", PC.searchProducts);
router.get("/filter", PC.getByBrandAndCategory);
router.get("/category/:categoryId", PC.getProductsByCategory);
router.get("/brand/:brandId", PC.getByBrand);

router.post("/get-stock", PC.getStock);
router.post("/relation", PC.relationProduct);
router.post("/get-products", PC.getProducts);
router.get("/admin/sale-report", adminGuard, PC.getSaleReport);
router.get("/admin/get-all", adminGuard, PC.getAllProducts);

// /:id phải đặt sau các route tĩnh
router.get("/:id", PC.getProductById);

// ================================================================
// ADMIN
// ================================================================
router.post("/create", adminGuard, PC.createProduct);
router.post("/:id/upload-image", adminGuard, PC.uploadImage);
router.put("/:id", adminGuard, PC.updateProduct);
router.delete("/:id", adminGuard, PC.deleteProductById);
router.patch("/:id/restore", adminGuard, PC.restoreProductById);
router.delete("/:id/permanent", authAdminMiddleware, PC.deleteProduct);
router.patch("/:id/toggle-featured", adminGuard, PC.toggleFeatured);
router.patch("/:id/toggle-visible", adminGuard, PC.toggleVisible);

module.exports = router;
