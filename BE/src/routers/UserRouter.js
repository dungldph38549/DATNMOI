const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

/**
 * HÀM KIỂM TRA AN TOÀN
 * Giúp server không bị crash nếu chẳng may bạn chưa định nghĩa hàm trong UserController
 */
const handle = (fn) => {
  if (typeof fn !== "function") {
    return (req, res) => {
      res.status(500).json({
        message:
          "Lỗi hệ thống: Hàm xử lý (Controller) chưa được định nghĩa hoặc export.",
      });
    };
  }
  return fn;
};

// ==========================================
// 1. PUBLIC ROUTES (KHÔNG CẦN ĐĂNG NHẬP)
// ==========================================
router.post(
  "/register",
  handle(
    UserController.register ||
      UserController.createUser ||
      UserController.registerUser,
  ),
);
router.post("/login", handle(UserController.login || UserController.loginUser));
router.post("/refresh-token", handle(UserController.refreshToken));
router.post("/google-login", handle(UserController.googleCallback));

// ==========================================
// 2. USER ROUTES (CẦN ĐĂNG NHẬP)
// ==========================================
router.post("/logout", protect, handle(UserController.logout));
router.get("/get-details", protect, handle(UserController.getDetailsUser));
router.put(
  "/update",
  protect,
  handle(UserController.updateCustomer || UserController.updateUser),
);

// ==========================================
// 3. ADMIN & STAFF ROUTES (QUẢN LÝ)
// ==========================================

// Lấy danh sách user có phân trang cho UI Admin
router.get(
  "/list",
  protect,
  restrictTo("admin", "staff"),
  handle(UserController.listUser),
);

// Lấy toàn bộ user (thường dùng cho Export Excel hoặc báo cáo)
router.get(
  "/all",
  protect,
  restrictTo("admin", "staff"),
  handle(UserController.getAllUser),
);

// Tạo tài khoản nhân viên từ trang quản trị (chỉ admin)
router.post(
  "/admin",
  protect,
  restrictTo("admin"),
  handle(UserController.adminCreateUser),
);

// Cập nhật user bất kỳ theo ID
router.put(
  "/admin/:id",
  protect,
  restrictTo("admin"),
  handle(UserController.updateUser),
);

// Xóa user
router.delete(
  "/admin/:id",
  protect,
  restrictTo("admin"),
  handle(UserController.deleteUser),
);

// ==========================================
// 4. GET BY ID (ĐỂ CUỐI CÙNG)
// ==========================================
// Route có tham số biến :id phải để dưới cùng để không "ăn" mất các route tĩnh bên trên
router.get("/:id", protect, handle(UserController.getUserById));

module.exports = router;
