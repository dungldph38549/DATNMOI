const VoucherService = require("../services/VoucherService");

const canSeeInternalVoucherFields = (user) =>
  Boolean(user && (user.isAdmin === true || user.isStaff === true));

const sanitizeVoucherPayload = (payload, user) => {
  if (payload == null) return payload;
  if (canSeeInternalVoucherFields(user)) return payload;
  const strip = (doc) => {
    const o =
      doc && typeof doc.toObject === "function"
        ? doc.toObject({ virtuals: false })
        : { ...doc };
    delete o.maxDiscount;
    delete o.maxDiscountAmount;
    delete o.usedBy;
    return o;
  };
  if (Array.isArray(payload)) return payload.map(strip);
  return strip(payload);
};

const createVoucher = async (req, res) => {
  try {
    const response = await VoucherService.createVoucher(req.body);
    if (response.status === "ERR") {
      return res.status(400).json(response);
    }
    return res.status(201).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

/** GET /api/voucher — voucher đang hiệu lực (public / theo owner) */
const getActiveVouchersPublic = async (req, res) => {
  try {
    const response = await VoucherService.getActiveVouchers(req.user || null);
    if (response.data) {
      response.data = sanitizeVoucherPayload(response.data, req.user);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

/** GET /api/voucher/admin — tất cả (admin) */
const getAllVouchersAdmin = async (req, res) => {
  try {
    const response = await VoucherService.getAllVouchersAdmin();
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

const getVoucherDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await VoucherService.getVoucherDetail(id, req.user || null);
    if (response.status === "ERR") {
      const status =
        response.message === "Không tìm thấy voucher" ? 404 : 400;
      return res.status(status).json(response);
    }
    if (response.data) {
      response.data = sanitizeVoucherPayload(response.data, req.user);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

const getVoucherByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const response = await VoucherService.getVoucherByCode(code, req.user || null);
    if (response.status === "ERR") {
      const status =
        response.message === "Không tìm thấy voucher" ? 404 : 400;
      return res.status(status).json(response);
    }
    if (response.data) {
      response.data = sanitizeVoucherPayload(response.data, req.user);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

const previewVoucherDiscount = async (req, res) => {
  try {
    const response = await VoucherService.previewVoucherDiscount(
      req.body,
      req.user || null,
    );
    if (response.status === "ERR") {
      return res.status(400).json(response);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

const applyVoucher = async (req, res) => {
  try {
    const response = await VoucherService.applyVoucher(req.body, req.user || null);
    if (response.status === "ERR") {
      return res.status(400).json(response);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await VoucherService.updateVoucher(id, req.body);
    if (response.status === "ERR") {
      const status =
        response.message === "Không tìm thấy voucher" ? 404 : 400;
      return res.status(status).json(response);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await VoucherService.deleteVoucher(id);
    if (response.status === "ERR") {
      const status =
        response.message === "Không tìm thấy voucher" ? 404 : 400;
      return res.status(status).json(response);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

const toggleVoucherActive = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await VoucherService.toggleVoucherActive(id);
    if (response.status === "ERR") {
      const status =
        response.message === "Không tìm thấy voucher" ? 404 : 400;
      return res.status(status).json(response);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Lỗi máy chủ",
    });
  }
};

module.exports = {
  createVoucher,
  getActiveVouchersPublic,
  getAllVouchersAdmin,
  getVoucherDetail,
  getVoucherByCode,
  previewVoucherDiscount,
  applyVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucherActive,
};
