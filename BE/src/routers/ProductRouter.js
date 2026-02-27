const express = require("express");
const router = express.Router();
const ProductController = require("../controller/ProductController");

// POST /api/product/create
router.post("/create", ProductController.createProduct);

module.exports = router;
