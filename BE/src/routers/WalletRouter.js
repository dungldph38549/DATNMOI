const express = require("express");
const router = express.Router();
const walletController = require("../controllers/WalletController.js");
const walletTopUpController = require("../controllers/walletTopUpController.js");
const {
  authMiddleware,
  authAdminMiddleware,
} = require("../middlewares/authMiddleware.js");

// VNPay nạp ví: return / IPN (public — redirect & server VNPay)
router.get("/topup/vnpay/return", walletTopUpController.vnpayTopupReturn);
router.get("/topup/vnpay/ipn", walletTopUpController.vnpayTopupIpn);
router.post("/topup/vnpay/ipn", walletTopUpController.vnpayTopupIpn);

router.get("/", authMiddleware, walletController.getMyWallet);
router.get(
  "/transactions",
  authMiddleware,
  walletController.getMyTransactions,
);

router.post(
  "/topup/vnpay/create-url",
  authMiddleware,
  walletTopUpController.createVnpayTopupUrl,
);
router.get("/topups", authMiddleware, walletTopUpController.listMyTopups);
router.get(
  "/admin/topups/transactions",
  authAdminMiddleware,
  walletTopUpController.adminListTopupTransactions,
);

module.exports = router;
