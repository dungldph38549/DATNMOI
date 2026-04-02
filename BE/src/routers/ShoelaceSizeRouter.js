const express = require("express");
const router = express.Router();
const ShoelaceSizeController = require("../controllers/ShoelaceSizeController");

router.post("/create", ShoelaceSizeController.createShoelaceSize);
router.put("/update/:id", ShoelaceSizeController.updateShoelaceSize);
router.delete("/delete/:id", ShoelaceSizeController.deleteShoelaceSize);
router.get("/get-all", ShoelaceSizeController.getAllShoelaceSize);
router.get("/get-details/:id", ShoelaceSizeController.getDetailShoelaceSize);

module.exports = router;
