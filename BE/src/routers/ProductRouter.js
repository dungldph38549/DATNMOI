const express = require("express");
const router = express.Router();
const ProductController = require("../controller/ProductController");

// GET /api/product
router.get("/", ProductController.getAllProducts);

// GET /api/product/:id
router.get("/:id", ProductController.getProductDetail);

// POST /api/product/create
router.post("/create", ProductController.createProduct);

// PUT /api/product/:id
router.put("/:id", ProductController.updateProduct);

// DELETE /api/product/:id
router.delete("/:id", ProductController.deleteProduct);

module.exports = router;
