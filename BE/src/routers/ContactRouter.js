const express = require("express");
const ContactController = require("../controllers/ContactController");
const { authAdminMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", ContactController.createContact);
router.get("/admin", authAdminMiddleware, ContactController.listContactsForAdmin);
router.patch("/admin/:id/status", authAdminMiddleware, ContactController.updateContactStatus);
router.delete("/admin/:id", authAdminMiddleware, ContactController.deleteContact);

module.exports = router;
