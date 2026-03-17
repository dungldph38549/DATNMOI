const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");

let authMiddleware, authAdminMiddleware, authStaffMiddleware;
try {
  const auth = require("../middlewares/authMiddleware");
  authMiddleware =
    auth.authMiddleware ||
    function (req, res, next) {
      next();
    };
  authAdminMiddleware =
    auth.authAdminMiddleware ||
    function (req, res, next) {
      next();
    };
  authStaffMiddleware = auth.authStaffMiddleware || authAdminMiddleware;
} catch (e) {
  console.warn("[UserRouter] Khong tim thay auth middleware");
  authMiddleware =
    authAdminMiddleware =
    authStaffMiddleware =
      function (req, res, next) {
        next();
      };
}

// PUBLIC
router.post("/register", UserController.createUser);
router.post("/login", UserController.loginUser);

// USER
router.put("/update", authMiddleware, UserController.updateCustomer);

// ADMIN
router.get("/list", authStaffMiddleware, UserController.listUser);
router.get("/admin/all", authAdminMiddleware, UserController.getAllUser);
router.put("/update/:id", authAdminMiddleware, UserController.updateUser);
router.delete("/admin/:id", authAdminMiddleware, UserController.deleteUser);

// /:id CUOI CUNG
router.get("/:id", authMiddleware, UserController.getUserById);

module.exports = router;
