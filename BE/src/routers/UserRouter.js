const express = require("express");
const router = express.Router();
const UserController = require("../controller/UserController");
const { protect } = require("../middleware/auth");

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/logout", protect, UserController.logout);
router.post("/refresh-token", UserController.refreshToken);
router.get("/get-details", protect, UserController.getDetailsUser);

// Google OAuth2 Callback (frontend sends data here after Google login)
router.post("/google-login", UserController.googleCallback);

module.exports = router;
