const express = require("express");
const ChatController = require("../controllers/ChatController");
const { authMiddleware, authAdminMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /api/chat/history?customerId=...
// - customer: tự lấy customerId từ token (req.user.id)
// - admin: dùng customerId query param
router.get("/history", authMiddleware, ChatController.history);

// GET /api/chat/inbox (admin only)
router.get("/inbox", authAdminMiddleware, ChatController.inbox);

module.exports = router;

