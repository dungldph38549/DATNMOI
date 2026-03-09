const express = require("express");
const router = express.Router();

const OrderController = require("../controller/OrderController");

// route test để mở trên trình duyệt
router.get("/", (req, res) => {
  res.send("Order API working");
});

// route test create trên trình duyệt
router.get("/create", (req, res) => {
  res.send("Order create API ready (use POST to create order)");
});

// API tạo đơn hàng
router.post("/create", OrderController.createOrder);

module.exports = router;