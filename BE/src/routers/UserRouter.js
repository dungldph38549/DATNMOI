const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");

// Dùng hệ thống auth mới (authMiddleware)
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// ==========================================
// 1. PUBLIC (KHÔNG CẦN LOGIN)
// ==========================================
router.post("/register", UserController.createUser);
router.post("/login", UserController.loginUser);
router.post("/refresh-token", UserController.refreshToken);
router.post("/google-login", UserController.googleCallback);

// ==========================================
// 2. USER (CẦN LOGIN)
// ==========================================
router.post("/logout", protect, UserController.logout);

router.get("/get-details", protect, UserController.getDetailsUser);

router.put("/update", protect, UserController.updateCustomer);

// ==========================================
// 3. ADMIN / STAFF
// ==========================================
router.get(
  "/list",
  protect,
  restrictTo("admin", "staff"),
  UserController.listUser,
);
router.get(
  "/all",
  protect,
  restrictTo("admin", "staff"),
  UserController.getAllUser,
);

// ==========================================
// 4. ADMIN ONLY
// ==========================================
router.post("/admin", protect, restrictTo("admin"), UserController.createUser);

router.put("/admin/:id", protect, restrictTo("admin"), UserController.updateUser);

router.delete(
  "/admin/:id",
  protect,
  restrictTo("admin"),
  UserController.deleteUser
);

// ==========================================
// 5. GET USER BY ID (ĐỂ CUỐI)
// ==========================================
router.get("/:id", protect, UserController.getUserById);

module.exports = router;