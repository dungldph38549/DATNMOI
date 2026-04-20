const User = require("../models/UserModel.js");
const WalletTransaction = require("../models/WalletTransactionModel.js");

exports.getMyWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("walletBalance");
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.status(200).json({
      balance: Math.max(0, Number(user.walletBalance) || 0),
    });
  } catch (err) {
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};

exports.getMyTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId: req.user.id };
    const [items, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("orderId", "totalAmount status createdAt")
        .populate("topUpId", "amount method status referenceCode createdAt")
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
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
      message: err?.message || err?.error || "Internal server error",
    });
  }
};
