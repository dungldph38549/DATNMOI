// routes/orderRouter.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/OrderController.js");
const {
  authMiddleware,
  authAdminMiddleware,
} = require("../middleware/authMiddleware.js");

// =================== BASIC ORDER MANAGEMENT ===================

// Tạo đơn hàng mới
router.post("/", orderController.createOrder);

// Lấy tất cả đơn hàng (Admin only)
router.get("/", authAdminMiddleware, orderController.getAllOrders);

// Xử lý thanh toán VNPay return
// router.get("/return-payment", orderController.returnPayment);

// Lấy đơn hàng theo user hoặc guest
router.get("/user", orderController.getOrdersByUserOrGuest);

// =================== ANALYTICS & REPORTING ===================

// Dashboard tổng quan
router.get("/dashboard", authAdminMiddleware, orderController.dashboard);

// Báo cáo doanh thu
router.get("/revenue", authAdminMiddleware, orderController.revenue);

// Top sản phẩm bán chạy
router.get("/topSelling", authAdminMiddleware, orderController.topSelling);

// Thống kê phương thức thanh toán
router.get(
  "/paymentMethod",
  authAdminMiddleware,
  orderController.paymentMethod,
);

// =================== RETURN SYSTEM ===================

// Lấy danh sách đơn hoàn hàng (Admin)
//router.get("/order-return", authAdminMiddleware, orderController.orderReturn);

// Tạo yêu cầu hoàn hàng (User)
// router.post(
//   "/returnOrderRequest",
//   authMiddleware,
//   orderController.returnOrderRequest
// );

// Admin xử lý yêu cầu hoàn hàng
// router.post(
//   "/acceptOrRejectReturn",
//   authAdminMiddleware,
//   orderController.acceptOrRejectReturn
// );

// =================== ORDER DETAILS & UPDATES ===================

// Chi tiết đơn hàng
router.get("/:id", orderController.getOrderById);

// Cập nhật đơn hàng từ admin
router.put("/:id", authAdminMiddleware, orderController.updateOrder);

// Cập nhật đơn hàng từ user
router.patch("/:id", authMiddleware, orderController.updateOrderById);

// User xác nhận đã nhận hàng
router.post(
  "/comfirmDelivery/:id",
  authMiddleware,
  orderController.comfirmDelivery,
);

// Xóa đơn hàng (Admin only)
router.delete("/:id", authAdminMiddleware, orderController.deleteOrder);

module.exports = router;
