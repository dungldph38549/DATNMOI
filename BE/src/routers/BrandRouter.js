const express = require("express");
const router = express.Router();
const BrandController = require("../controller/BrandController");

// POST /api/brand/create
router.post("/create", BrandController.createBrand);
// GET /api/brand
router.get("/", BrandController.getAllBrands);
// GET /api/brand/:id
router.get("/:id", BrandController.getBrandDetail);
// PUT /api/brand/:id
router.put("/:id", BrandController.updateBrand);
// DELETE /api/brand/:id
router.delete("/:id", BrandController.deleteBrand);

module.exports = router;


