const { default: mongoose } = require("mongoose");
const {
  VNPay,
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  InpOrderAlreadyConfirmed,
  IpnInvalidAmount,
  IpnUnknownError,
} = require("vnpay");
const WalletTopUp = require("../models/WalletTopUpModel.js");
const WalletTransaction = require("../models/WalletTransactionModel.js");
const { creditWalletForTopUp } = require("../services/walletService.js");

const vnpayEnv = (key, fallback) => {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") return fallback;
  return String(v).trim();
};

const getVnpayClient = () =>
  new VNPay({
    tmnCode: vnpayEnv("VNP_TMN_CODE", "DEMOMERCHANT01"),
    secureSecret: vnpayEnv("VNP_HASH_SECRET", "SECRETKEY"),
    vnpayHost: vnpayEnv("VNP_URL", "https://sandbox.vnpayment.vn"),
    testMode: String(process.env.VNP_TEST_MODE || "true") !== "false",
  });

const getBackendPublicBaseUrl = (req) => {
  if (process.env.BE_URL) return process.env.BE_URL;
  if (process.env.API_URL) return process.env.API_URL.replace(/\/api\/?$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
};

const pickVnpParams = (input = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (key.startsWith("vnp_")) out[key] = value;
  }
  return out;
};

const mergeVnpayIpnParams = (req) => {
  const out = pickVnpParams(req.query || {});
  if (req.body && typeof req.body === "object") {
    for (const [k, v] of Object.entries(req.body)) {
      if (!k.startsWith("vnp_")) continue;
      if (out[k] === undefined) out[k] = v;
    }
  }
  return out;
};

const isTopupAmountMatched = (expectedAmountVnd, receivedVnpAmount) => {
  const expected = Math.round(Number(expectedAmountVnd) || 0);
  const received = Math.round(Number(receivedVnpAmount) || 0);
  if (expected <= 0 || received <= 0) return false;
  // Tùy thư viện VNPay có thể trả số tiền theo VND hoặc x100.
  return received === expected || received === expected * 100;
};

const isVnpaySuccessResult = (result = {}) => {
  const responseCode = String(result.vnp_ResponseCode ?? "").trim();
  const txStatus = String(result.vnp_TransactionStatus ?? "").trim();
  // Mặc định thành công khi responseCode=00; một số cấu hình trả thêm TransactionStatus=00.
  if (responseCode !== "00") return false;
  if (txStatus && txStatus !== "00") return false;
  return true;
};

/** Nối thêm query khi base đã có ?... (tránh /profile?tab=wallet?topup=1). */
const appendQuery = (baseUrl, queryWithoutQuestion) => {
  const b = String(baseUrl || "");
  const sep = b.includes("?") ? "&" : "?";
  return `${b}${sep}${queryWithoutQuestion}`;
};

const MIN_TOPUP = 10000;
const maxTopup = () =>
  Math.min(
    500_000_000,
    Math.max(MIN_TOPUP, Number(process.env.WALLET_TOPUP_MAX || 50_000_000)),
  );

const isTransactionUnsupportedError = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("replica set") ||
    msg.includes("transaction numbers are only allowed") ||
    msg.includes("transactions are not supported")
  );
};

const creditTopupWithOptionalTransaction = async (topUpId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const fresh = await WalletTopUp.findById(topUpId).session(session);
    if (!fresh) throw new Error("Không tìm thấy yêu cầu nạp ví");
    await creditWalletForTopUp(fresh, session);
    await session.commitTransaction();
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch {
      // ignore abort errors
    }
    if (!isTransactionUnsupportedError(err)) {
      throw err;
    }
    // Fallback cho Mongo standalone (không bật replica set).
    const fresh = await WalletTopUp.findById(topUpId);
    if (!fresh) throw new Error("Không tìm thấy yêu cầu nạp ví");
    await creditWalletForTopUp(fresh, null);
  } finally {
    session.endSession();
  }
};

exports.createVnpayTopupUrl = async (req, res) => {
  try {
    const amount = Math.round(Number(req.body?.amount));
    const returnUrl = req.body?.returnUrl;
    const cancelUrl = req.body?.cancelUrl;
    const hi = maxTopup();
    if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > hi) {
      return res.status(422).json({
        message: `Số tiền nạp từ ${MIN_TOPUP.toLocaleString("vi-VN")}đ đến ${hi.toLocaleString("vi-VN")}đ`,
      });
    }

    const topUp = await WalletTopUp.create({
      userId: req.user.id,
      amount,
      method: "vnpay",
      status: "pending",
    });

    const feUrl = process.env.FE_URL || "http://localhost:3000";
    const backendBaseUrl = getBackendPublicBaseUrl(req);
    const redirectSuccess = encodeURIComponent(
      returnUrl || `${feUrl}/profile?tab=wallet`,
    );
    const redirectCancel = encodeURIComponent(
      cancelUrl || `${feUrl}/profile?tab=wallet`,
    );

    const vnp = getVnpayClient();
    const paymentUrl = vnp.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_TxnRef: String(topUp._id),
      vnp_OrderInfo: `Nap vi ${amount} VND`,
      vnp_ReturnUrl: `${backendBaseUrl}/api/wallet/topup/vnpay/return?redirect=${redirectSuccess}&cancelRedirect=${redirectCancel}`,
      vnp_IpAddr: req.ip || "127.0.0.1",
    });

    res.status(201).json({
      paymentUrl,
      topUpId: topUp._id,
      amount,
    });
  } catch (err) {
    const statusCode = err?.statusCode || err?.status || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

exports.vnpayTopupReturn = async (req, res) => {
  const feUrl = process.env.FE_URL || "http://localhost:3000";
  const resolveSafeUrl = (raw, fallback) => {
    if (!raw) return fallback;
    try {
      const decoded = decodeURIComponent(String(raw));
      return decoded.startsWith("http://") || decoded.startsWith("https://")
        ? decoded
        : fallback;
    } catch {
      return fallback;
    }
  };

  try {
    const vnp = getVnpayClient();
    const result = vnp.verifyReturnUrl(pickVnpParams(req.query || {}));
    const topUpId = result.vnp_TxnRef;
    const successUrl = resolveSafeUrl(
      req.query?.redirect,
      `${feUrl}/profile?tab=wallet`,
    );
    const cancelUrl = resolveSafeUrl(
      req.query?.cancelRedirect,
      `${feUrl}/profile?tab=wallet`,
    );

    const topUp = await WalletTopUp.findById(topUpId);
    if (!topUp || topUp.method !== "vnpay") {
      return res.redirect(appendQuery(cancelUrl, "topup=0&reason=invalid"));
    }

    const ok = result.isVerified && isVnpaySuccessResult(result);
    if (!ok) {
      await WalletTopUp.findOneAndUpdate(
        { _id: topUpId, status: { $ne: "completed" } },
        { status: "failed" },
      );
      return res.redirect(appendQuery(cancelUrl, "topup=0"));
    }

    if (!isTopupAmountMatched(topUp.amount, result.vnp_Amount)) {
      await WalletTopUp.findOneAndUpdate(
        { _id: topUpId, status: { $ne: "completed" } },
        { status: "failed" },
      );
      return res.redirect(appendQuery(cancelUrl, "topup=0&reason=amount"));
    }

    await creditTopupWithOptionalTransaction(topUpId);

    return res.redirect(
      appendQuery(successUrl, `topup=1&amount=${encodeURIComponent(topUp.amount)}`),
    );
  } catch (err) {
    console.error("[VNPay topup return]", err?.message || err);
    return res.redirect(`${feUrl}/profile?tab=wallet&topup=0&error=1`);
  }
};

exports.vnpayTopupIpn = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const params = mergeVnpayIpnParams(req);
    const vnp = getVnpayClient();
    const result = vnp.verifyIpnCall(params);

    if (!result.isVerified) {
      return res.status(200).json(IpnFailChecksum);
    }

    const topUpId = result.vnp_TxnRef;
    const topUp = await WalletTopUp.findById(topUpId);
    if (!topUp || topUp.method !== "vnpay") {
      return res.status(200).json(IpnOrderNotFound);
    }

    if (!isTopupAmountMatched(topUp.amount, result.vnp_Amount)) {
      return res.status(200).json(IpnInvalidAmount);
    }

    const ok = isVnpaySuccessResult(result);
    if (ok) {
      if (topUp.status === "completed") {
        return res.status(200).json(InpOrderAlreadyConfirmed);
      }
      await creditTopupWithOptionalTransaction(topUpId);
    } else {
      await WalletTopUp.findOneAndUpdate(
        { _id: topUpId, status: { $ne: "completed" } },
        { status: "failed" },
      );
    }

    return res.status(200).json(IpnSuccess);
  } catch (err) {
    console.error("[VNPay topup IPN]", err?.message || err);
    return res.status(200).json(IpnUnknownError);
  }
};

exports.listMyTopups = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      WalletTopUp.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTopUp.countDocuments({ userId: req.user.id }),
    ]);
    res.status(200).json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Internal server error" });
  }
};

exports.adminListTopupTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const topupTypes = ["topup_vnpay", "topup_bank"];
    const typeScope = String(req.query.type || "all").trim().toLowerCase();
    const filter =
      typeScope === "topup"
        ? { type: { $in: topupTypes } }
        : {};

    const [items, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email phone")
        .populate("topUpId", "amount method status referenceCode createdAt")
        .populate("orderId", "_id totalAmount status paymentMethod createdAt")
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);

    res.status(200).json({
      data: items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Internal server error" });
  }
};
