const express = require("express");
const router = express.Router();
const ProductController = require("../controller/ProductController");

// GET all products
router.get("/", ProductController.getAllProducts);

// GET product detail
router.get("/:id", ProductController.getProductDetail);

// CREATE product
router.post("/", ProductController.createProduct);

// UPDATE product
router.put("/:id", ProductController.updateProduct);

// DELETE product
router.delete("/:id", ProductController.deleteProduct);

module.exports = router;