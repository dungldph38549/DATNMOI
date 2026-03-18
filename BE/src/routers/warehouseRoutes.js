const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/warehouseController");
const { authMiddleware, authAdminMiddleware } = require("../middlewares/authMiddleware.js");

router.get("/", authMiddleware, ctrl.getAll);
router.get("/:id", authMiddleware, ctrl.getById);
router.get("/:id/stock", authMiddleware, ctrl.getWarehouseStock);

router.use(authAdminMiddleware);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.deactivate);

module.exports = router;
