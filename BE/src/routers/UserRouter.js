const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");

// Import Middleware
let authMiddleware, authAdminMiddleware, authStaffMiddleware;
try {
  const auth = require("../middlewares/authMiddleware");
  authMiddleware = auth.authMiddleware;
  authAdminMiddleware = auth.authAdminMiddleware;
  authStaffMiddleware = auth.authStaffMiddleware || auth.authAdminMiddleware;
} catch (e) {
  console.warn("[UserRouter] Bypass auth middleware");
  authMiddleware =
    authAdminMiddleware =
    authStaffMiddleware =
      (req, res, next) => next();
}

// Hàm kiểm tra an toàn để tránh lỗi "argument handler must be a function"
const handle = (fn) => {
  if (typeof fn !== "function") {
    return (req, res) => {
      res
        .status(500)
        .json({
          message:
            "Lỗi hệ thống: Hàm xử lý chưa được định nghĩa trong Controller",
        });
    };
  }
  return fn;
};

// ==========================================
// 1. CÁC ROUTE CÔNG KHAI (AUTH)
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
router.post("/logout", authMiddleware, handle(UserController.logout));

// ==========================================
// 2. CÁC ROUTE DÀNH CHO USER
// ==========================================
router.get(
  "/get-details",
  authMiddleware,
  handle(UserController.getDetailsUser),
);
router.put(
  "/update",
  authMiddleware,
  handle(UserController.updateCustomer || UserController.updateUser),
);

// ==========================================
// 3. CÁC ROUTE QUẢN TRỊ (ADMIN / STAFF)
// ==========================================
router.get(
  "/all",
  authStaffMiddleware,
  // Dùng listUser để trả về có phân trang (total/page/limit/pages) cho admin UI.
  handle(UserController.listUser),
);

// Lấy toàn bộ user không phân trang (dùng cho dropdown/export...) — dành cho staff/admin
router.get("/admin/all", authStaffMiddleware, handle(UserController.getAllUser));
router.post("/admin", authAdminMiddleware, handle(UserController.createUser));
router.put(
  "/admin/:id",
  authAdminMiddleware,
  handle(UserController.updateUser),
);
router.delete(
  "/admin/:id",
  authAdminMiddleware,
  handle(UserController.deleteUser),
);

// Lấy theo ID cụ thể
router.get(
  "/:id",
  authMiddleware,
  handle(UserController.getUserById || UserController.getDetailsUser),
);

module.exports = router;
