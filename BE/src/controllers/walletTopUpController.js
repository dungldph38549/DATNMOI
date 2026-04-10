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

const MIN_TOPUP = 10000;
const maxTopup = () =>
  Math.min(
    500_000_000,
    Math.max(MIN_TOPUP, Number(process.env.WALLET_TOPUP_MAX || 50_000_000)),
  );

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
      return res.redirect(`${cancelUrl}?topup=0&reason=invalid`);
    }

    const ok =
      result.isVerified && result.isSuccess && String(result.vnp_ResponseCode ?? "") === "00";
    if (!ok) {
      await WalletTopUp.findOneAndUpdate(
        { _id: topUpId, status: { $ne: "completed" } },
        { status: "failed" },
      );
      return res.redirect(`${cancelUrl}?topup=0`);
    }

    const expected = Math.round(Number(topUp.amount) * 100);
    const received = Number(result.vnp_Amount);
    if (expected !== received) {
      await WalletTopUp.findOneAndUpdate(
        { _id: topUpId, status: { $ne: "completed" } },
        { status: "failed" },
      );
      return res.redirect(`${cancelUrl}?topup=0&reason=amount`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const fresh = await WalletTopUp.findById(topUpId).session(session);
      await creditWalletForTopUp(fresh, session);
      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }

    return res.redirect(`${successUrl}?topup=1&amount=${topUp.amount}`);
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

    const expected = Math.round(Number(topUp.amount) * 100);
    const received = Number(result.vnp_Amount);
    if (expected !== received) {
      return res.status(200).json(IpnInvalidAmount);
    }

    const ok =
      result.isSuccess && String(result.vnp_ResponseCode ?? "") === "00";
    if (ok) {
      if (topUp.status === "completed") {
        return res.status(200).json(InpOrderAlreadyConfirmed);
      }
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const fresh = await WalletTopUp.findById(topUpId).session(session);
        await creditWalletForTopUp(fresh, session);
        await session.commitTransaction();
      } catch (e) {
        await session.abortTransaction();
        throw e;
      } finally {
        session.endSession();
      }
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

exports.getBankInfo = async (req, res) => {
  try {
    res.status(200).json({
      bankName: process.env.WALLET_BANK_NAME || "",
      accountNumber: process.env.WALLET_BANK_ACCOUNT || "",
      accountOwner: process.env.WALLET_BANK_OWNER || "",
      branch: process.env.WALLET_BANK_BRANCH || "",
      note:
        process.env.WALLET_BANK_NOTE ||
        "Ghi đúng nội dung chuyển khoản để được xử lý nhanh.",
    });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Internal server error" });
  }
};

exports.createBankTopupRequest = async (req, res) => {
  try {
    const amount = Math.round(Number(req.body?.amount));
    const hi = maxTopup();
    if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > hi) {
      return res.status(422).json({
        message: `Số tiền từ ${MIN_TOPUP.toLocaleString("vi-VN")}đ đến ${hi.toLocaleString("vi-VN")}đ`,
      });
    }

    const referenceCode = WalletTopUp.generateReferenceCode(req.user.id);
    const topUp = await WalletTopUp.create({
      userId: req.user.id,
      amount,
      method: "bank_transfer",
      status: "awaiting_transfer",
      referenceCode,
    });

    const bank = {
      bankName: process.env.WALLET_BANK_NAME || "",
      accountNumber: process.env.WALLET_BANK_ACCOUNT || "",
      accountOwner: process.env.WALLET_BANK_OWNER || "",
      branch: process.env.WALLET_BANK_BRANCH || "",
      note:
        process.env.WALLET_BANK_NOTE ||
        "Ghi đúng nội dung chuyển khoản.",
    };

    res.status(201).json({ topUp, bank });
  } catch (err) {
    const statusCode = err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

exports.markBankTopupSent = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await WalletTopUp.findOneAndUpdate(
      {
        _id: id,
        userId: req.user.id,
        method: "bank_transfer",
        status: "awaiting_transfer",
      },
      { status: "awaiting_admin", userMarkedSentAt: new Date() },
      { new: true },
    );
    if (!updated) {
      return res.status(400).json({
        message: "Không tìm thấy yêu cầu hoặc đã xử lý",
      });
    }
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err?.message || "Internal server error" });
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

exports.adminListBankPending = async (req, res) => {
  try {
    const items = await WalletTopUp.find({
      method: "bank_transfer",
      status: { $in: ["awaiting_transfer", "awaiting_admin"] },
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email phone")
      .limit(200)
      .lean();
    res.status(200).json({ data: items });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Internal server error" });
  }
};

exports.adminConfirmBankTopup = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;
    const topUp = await WalletTopUp.findById(id).session(session);
    if (!topUp || topUp.method !== "bank_transfer") {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp CK" });
    }
    if (topUp.status !== "awaiting_admin") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Chỉ xác nhận được khi khách đã bấm 'Tôi đã chuyển khoản'",
      });
    }

    const adminId = req.user?.id || req.user?._id;
    const conf =
      adminId && mongoose.Types.ObjectId.isValid(String(adminId))
        ? new mongoose.Types.ObjectId(String(adminId))
        : undefined;
    await creditWalletForTopUp(topUp, session, conf ? { confirmedBy: conf } : {});

    await session.commitTransaction();
    session.endSession();
    const out = await WalletTopUp.findById(id).lean();
    res.status(200).json(out);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err?.message || "Internal server error" });
  }
};

exports.adminRejectBankTopup = async (req, res) => {
  try {
    const { id } = req.params;
    const note = String(req.body?.note || "").trim();
    const updated = await WalletTopUp.findOneAndUpdate(
      {
        _id: id,
        method: "bank_transfer",
        status: { $in: ["awaiting_transfer", "awaiting_admin"] },
      },
      { status: "rejected", adminNote: note },
      { new: true },
    );
    if (!updated) {
      return res.status(400).json({ message: "Không thể từ chối yêu cầu này" });
    }
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err?.message || "Internal server error" });
  }
};
