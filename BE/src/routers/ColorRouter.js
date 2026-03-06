const express = require("express");
const router = express.Router();
const ColorController = require("../controller/ColorController");

router.post("/create", ColorController.createColor);
router.put("/update/:id", ColorController.updateColor);
router.delete("/delete/:id", ColorController.deleteColor);
router.get("/get-all", ColorController.getAllColor);
router.get("/get-details/:id", ColorController.getDetailColor);

module.exports = router;
