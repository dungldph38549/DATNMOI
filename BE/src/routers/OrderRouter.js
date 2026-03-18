// routes/orderRouter.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/OrderController.js");
const {
  authMiddleware,
  authAdminMiddleware,
} = require("../middlewares/authMiddleware");

// =================== BASIC ORDER MANAGEMENT ===================

// Tạo đơn hàng mới
router.post("/", orderController.createOrder);

// VNPay return URL (public - VNPay redirect về đây)
router.get("/return-payment", orderController.returnPayment);

// Lấy tất cả đơn hàng (Admin only)
router.get("/", authAdminMiddleware, orderController.getAllOrders);

// Lấy đơn hàng theo user (cần đăng nhập) hoặc guest
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

// =================== ORDER DETAILS & UPDATES ===================

// Chi tiết đơn hàng
router.get("/:id", orderController.getOrderById);

// VNPay: Tạo URL thanh toán cho đơn (user hoặc guest)
router.post("/:id/create-vnpay-url", orderController.createVnpayUrl);

// User: Yêu cầu hoàn hàng
router.post("/:id/return-request", authMiddleware, orderController.returnOrderRequest);

// Admin: Chấp nhận / Từ chối hoàn hàng
router.put("/:id/accept-return", authAdminMiddleware, orderController.acceptOrRejectReturn);
router.put("/:id/reject-return", authAdminMiddleware, orderController.acceptOrRejectReturn);

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
