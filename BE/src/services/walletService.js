const User = require("../models/UserModel.js");
const WalletTransaction = require("../models/WalletTransactionModel.js");
const WalletTopUp = require("../models/WalletTopUpModel.js");

/**
 * Khi admin chấp nhận hoàn hàng: cộng tiền đơn vào ví user (đơn có tài khoản).
 * @returns {Promise<Object>} Patch cập nhật Order (rỗng nếu bỏ qua).
 */
async function buildWalletRefundPatchForReturn(order, session) {
  if (!order?.userId) return {};
  if (order.walletRefundTransactionId) return {};
  // COD: tiền không thu qua ví/VNPay trong hệ thống — không hoàn vào ví.
  if (order.paymentMethod === "cod") return {};

  if (order.paymentMethod === "vnpay" && order.paymentStatus !== "paid") {
    return {};
  }

  const amount = Math.round(Number(order.totalAmount) || 0);
  if (amount <= 0) return {};

  const user = await User.findById(order.userId).session(session);
  if (!user) {
    throw new Error("Không tìm thấy người dùng để hoàn tiền vào ví");
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: order.userId },
    { $inc: { walletBalance: amount } },
    { new: true, session },
  );

  const balanceAfter = Math.max(0, Number(updatedUser.walletBalance) || 0);

  const [tx] = await WalletTransaction.create(
    [
      {
        userId: order.userId,
        orderId: order._id,
        type: "return_refund",
        amount,
        balanceAfter,
        note: "Hoàn tiền hoàn hàng",
      },
    ],
    { session },
  );

  return {
    walletRefundTransactionId: tx._id,
    walletRefundAmount: amount,
    walletRefundedAt: new Date(),
  };
}

/**
 * Trừ ví khi đặt hàng thanh toán bằng ví (đơn đã lưu, có _id).
 * @returns {{ walletPaymentTransactionId: import("mongoose").Types.ObjectId }}
 */
async function debitWalletForUserOrder(userId, orderId, amount, session) {
  const rounded = Math.round(Number(amount) || 0);
  if (rounded <= 0) {
    throw new Error("Số tiền thanh toán ví không hợp lệ");
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: rounded } },
    { $inc: { walletBalance: -rounded } },
    { new: true, session },
  );

  if (!updatedUser) {
    const u = await User.findById(userId).session(session);
    const bal = Number(u?.walletBalance) || 0;
    throw Object.assign(new Error("Số dư ví không đủ"), {
      statusCode: 422,
      balance: bal,
      required: rounded,
    });
  }

  const balanceAfter = Math.max(0, Number(updatedUser.walletBalance) || 0);

  const [tx] = await WalletTransaction.create(
    [
      {
        userId,
        orderId,
        type: "order_payment",
        amount: rounded,
        balanceAfter,
        note: "Thanh toán đơn hàng bằng ví",
      },
    ],
    { session },
  );

  return { walletPaymentTransactionId: tx._id };
}

/**
 * Hoàn ví khi hủy đơn đã thanh toán (ví hoặc VNPay), tài khoản có userId.
 * Khách guest (không userId): không cộng ví — shop xử lý thủ công nếu cần.
 * @returns {Promise<Object>} Patch cho Order
 */
async function buildWalletCancelRefundPatch(order, session) {
  if (!order?.userId) return {};
  if (order.paymentStatus !== "paid") return {};
  if (order.walletCancelRefundTransactionId) return {};

  const paidByWallet = order.paymentMethod === "wallet";
  const paidByVnpay = order.paymentMethod === "vnpay";
  if (!paidByWallet && !paidByVnpay) return {};

  const existing = await WalletTransaction.findOne({
    orderId: order._id,
    type: "order_cancel_refund",
  }).session(session);
  if (existing) return {};

  const amount = Math.round(Number(order.totalAmount) || 0);
  if (amount <= 0) return {};

  const updatedUser = await User.findOneAndUpdate(
    { _id: order.userId },
    { $inc: { walletBalance: amount } },
    { new: true, session },
  );
  if (!updatedUser) {
    throw new Error("Không tìm thấy người dùng để hoàn ví");
  }

  const balanceAfter = Math.max(0, Number(updatedUser.walletBalance) || 0);

  const note = paidByVnpay
    ? "Hoàn ví do hủy đơn (đã thanh toán VNPay)"
    : "Hoàn ví do hủy đơn (thanh toán ví)";

  const [tx] = await WalletTransaction.create(
    [
      {
        userId: order.userId,
        orderId: order._id,
        type: "order_cancel_refund",
        amount,
        balanceAfter,
        note,
      },
    ],
    { session },
  );

  return { walletCancelRefundTransactionId: tx._id };
}

/**
 * Hoàn ví khi khách/admin hủy một dòng sản phẩm (đơn ví đã thanh toán).
 * Có thể gọi nhiều lần trên cùng đơn (mỗi dòng một giao dịch).
 */
async function creditWalletForOrderLineCancel(userId, orderId, amount, session) {
  if (!userId || !orderId) return;
  const rounded = Math.round(Number(amount) || 0);
  if (rounded <= 0) return;

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { walletBalance: rounded } },
    { new: true, session },
  );
  if (!updatedUser) {
    throw new Error("Không tìm thấy người dùng để hoàn ví");
  }

  const balanceAfter = Math.max(0, Number(updatedUser.walletBalance) || 0);

  await WalletTransaction.create(
    [
      {
        userId,
        orderId,
        type: "order_line_cancel_refund",
        amount: rounded,
        balanceAfter,
        note: "Hoàn ví do hủy dòng hàng trong đơn",
      },
    ],
    { session },
  );
}

/**
 * Cộng ví khi nạp (VNPay, user xác nhận CK, hoặc admin).
 * @param {import("mongoose").Document} topUpDoc
 * @param {import("mongoose").ClientSession} session
 * @param {{ confirmedBy?: import("mongoose").Types.ObjectId, patchTopUp?: Record<string, unknown> }} [options]
 */
async function creditWalletForTopUp(topUpDoc, session, options = {}) {
  if (topUpDoc.status === "completed" && topUpDoc.walletTransactionId) {
    return { alreadyCompleted: true };
  }

  const amount = Math.round(Number(topUpDoc.amount) || 0);
  if (amount <= 0) throw new Error("Số tiền nạp không hợp lệ");

  const dup = await WalletTransaction.findOne({
    topUpId: topUpDoc._id,
  }).session(session);
  if (dup) {
    await WalletTopUp.findByIdAndUpdate(
      topUpDoc._id,
      {
        status: "completed",
        walletTransactionId: dup._id,
        completedAt: new Date(),
        ...(options.patchTopUp || {}),
      },
      { session },
    );
    return { alreadyCompleted: true };
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: topUpDoc.userId },
    { $inc: { walletBalance: amount } },
    { new: true, session },
  );
  if (!updatedUser) throw new Error("Không tìm thấy người dùng");

  const balanceAfter = Math.max(0, Number(updatedUser.walletBalance) || 0);
  const type =
    topUpDoc.method === "vnpay" ? "topup_vnpay" : "topup_bank";

  const [tx] = await WalletTransaction.create(
    [
      {
        userId: topUpDoc.userId,
        orderId: null,
        topUpId: topUpDoc._id,
        type,
        amount,
        balanceAfter,
        note:
          topUpDoc.method === "vnpay"
            ? "Nạp tiền VNPay"
            : "Nạp tiền chuyển khoản",
      },
    ],
    { session },
  );

  await WalletTopUp.findByIdAndUpdate(
    topUpDoc._id,
    {
      status: "completed",
      walletTransactionId: tx._id,
      completedAt: new Date(),
      ...(options.confirmedBy ? { confirmedBy: options.confirmedBy } : {}),
      ...(options.patchTopUp || {}),
    },
    { session },
  );

  return { walletTransactionId: tx._id };
}

module.exports = {
  buildWalletRefundPatchForReturn,
  debitWalletForUserOrder,
  buildWalletCancelRefundPatch,
  creditWalletForOrderLineCancel,
  creditWalletForTopUp,
};
