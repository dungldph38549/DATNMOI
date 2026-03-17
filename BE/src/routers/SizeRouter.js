const express = require("express");
const router = express.Router();
const SizeController = require("../controllers/SizeController");

router.post("/create", SizeController.createSize);
router.put("/update/:id", SizeController.updateSize);
router.delete("/delete/:id", SizeController.deleteSize);
router.get("/get-all", SizeController.getAllSize);
router.get("/get-details/:id", SizeController.getDetailSize);

module.exports = router;
