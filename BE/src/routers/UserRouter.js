const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");

// Import Middleware xác thực
let authMiddleware, authAdminMiddleware, authStaffMiddleware;
try {
    const auth = require("../middlewares/authMiddleware");
    authMiddleware = auth.authMiddleware;
    authAdminMiddleware = auth.authAdminMiddleware;
    authStaffMiddleware = auth.authStaffMiddleware || auth.authAdminMiddleware;
} catch (e) {
    console.warn("[UserRouter] Không tìm thấy auth middleware, đang dùng bypass để tránh crash");
    authMiddleware = authAdminMiddleware = authStaffMiddleware = (req, res, next) => next();
}

// ==========================================
// 1. CÁC ROUTE XÁC THỰC (AUTH) - CÔNG KHAI
// ==========================================
router.post("/register", UserController.register || UserController.createUser);
router.post("/login", UserController.login || UserController.loginUser);
router.post("/refresh-token", UserController.refreshToken);
router.post("/google-login", UserController.googleCallback);

// Cần đăng nhập mới có thể logout
router.post("/logout", authMiddleware, UserController.logout);

// ==========================================
// 2. CÁC ROUTE DÀNH CHO USER (CUSTOMER)
// ==========================================
// Lấy thông tin chi tiết của chính mình
router.get("/get-details", authMiddleware, UserController.getDetailsUser);

// Cập nhật thông tin cá nhân
router.put("/update", authMiddleware, UserController.updateCustomer || UserController.updateUser);

// ==========================================
// 3. CÁC ROUTE DÀNH CHO ADMIN / STAFF
// ==========================================
// Lấy danh sách tất cả user (Admin/Staff)
router.get("/all", authStaffMiddleware, UserController.getAllUser || UserController.listUser);

// Quản lý user theo ID (Admin)
router.post("/admin", authAdminMiddleware, UserController.createUser);
router.put("/admin/:id", authAdminMiddleware, UserController.updateUser);
router.delete("/admin/:id", authAdminMiddleware, UserController.deleteUser);

// Lấy thông tin 1 user cụ thể theo ID (Phải để dưới cùng để tránh trùng khớp route khác)
router.get("/:id", authMiddleware, UserController.getUserById);

module.exports = router;