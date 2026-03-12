const express = require("express");
const router = express.Router();

const UserController = require("../controller/UserController");
const { protect } = require("../middleware/auth");

// ==========================================
// 1. CÁC ROUTE XÁC THỰC (AUTH)
// ==========================================
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/logout", protect, UserController.logout);
router.post("/refresh-token", UserController.refreshToken);
router.get("/get-details", protect, UserController.getDetailsUser);

// Google OAuth2 Callback
router.post("/google-login", UserController.googleCallback);

// ==========================================
// 2. CÁC ROUTE QUẢN LÝ USER (CRUD)
// ==========================================
// Lấy danh sách tất cả user
router.get("/", UserController.getAllUsers);

// Lấy thông tin 1 user cụ thể
router.get("/:id", UserController.getUserById);

// Tạo user mới (từ Admin)
router.post("/", UserController.createUser);

// Cập nhật thông tin user
router.put("/:id", UserController.updateUser);

// Xóa user
router.delete("/:id", UserController.deleteUser);

module.exports = router;