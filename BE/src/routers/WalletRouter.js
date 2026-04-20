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
router.get("/bank-info", authMiddleware, walletTopUpController.getBankInfo);
router.post(
  "/topup/bank/request",
  authMiddleware,
  walletTopUpController.createBankTopupRequest,
);
router.post(
  "/topup/bank/:id/mark-sent",
  authMiddleware,
  walletTopUpController.markBankTopupSent,
);
router.get("/topups", authMiddleware, walletTopUpController.listMyTopups);

router.get(
  "/admin/topups/bank-pending",
  authAdminMiddleware,
  walletTopUpController.adminListBankPending,
);
router.post(
  "/admin/topups/:id/confirm-bank",
  authAdminMiddleware,
  walletTopUpController.adminConfirmBankTopup,
);
router.post(
  "/admin/topups/:id/reject-bank",
  authAdminMiddleware,
  walletTopUpController.adminRejectBankTopup,
);

module.exports = router;
