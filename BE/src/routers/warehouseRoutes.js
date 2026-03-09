const express = require("express");
const router = express.Router();
const ctrl = exports; // same file demo — tách ra thực tế
const { authMiddleware, authAdminMiddleware } = require("../middlewares/auth");

router.get("/", authMiddleware, ctrl.getAll);
router.get("/:id", authMiddleware, ctrl.getById);
router.get("/:id/stock", authMiddleware, ctrl.getWarehouseStock);

router.use(authAdminMiddleware);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.deactivate);

module.exports = router;
