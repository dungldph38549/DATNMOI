const express = require("express");
const router = express.Router();
const CartController = require("../controller/CartController");

// Lấy giỏ hàng theo userId
router.get("/:userId", CartController.getCart);

// Thêm / cộng dồn sản phẩm vào giỏ
router.post("/:userId/items", CartController.addItem);

// Cập nhật số lượng sản phẩm trong giỏ
router.put("/:userId/items/:productId", CartController.updateItemQty);

// Xóa 1 sản phẩm khỏi giỏ
router.delete("/:userId/items/:productId", CartController.removeItem);

// Xóa toàn bộ giỏ
router.delete("/:userId", CartController.clearCart);

module.exports = router;

