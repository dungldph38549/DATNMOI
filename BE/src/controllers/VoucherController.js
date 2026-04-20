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
    delete o.maxDiscountAmount;
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
      message: e.message || "Internal server error",
    });
  }
};

const getAllVouchers = async (req, res) => {
  try {
    const response = await VoucherService.getAllVouchers();
    if (response.data) {
      response.data = sanitizeVoucherPayload(response.data, req.user);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const getVoucherDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await VoucherService.getVoucherDetail(id);

    if (response.status === "ERR") {
      const status = response.message === "Voucher not found" ? 404 : 400;
      return res.status(status).json(response);
    }

    if (response.data) {
      response.data = sanitizeVoucherPayload(response.data, req.user);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const getVoucherByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const response = await VoucherService.getVoucherByCode(code);

    if (response.status === "ERR") {
      const status = response.message === "Voucher not found" ? 404 : 400;
      return res.status(status).json(response);
    }

    if (response.data) {
      response.data = sanitizeVoucherPayload(response.data, req.user);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const previewVoucherDiscount = async (req, res) => {
  try {
    const response = await VoucherService.previewVoucherDiscount(req.body);
    if (response.status === "ERR") {
      return res.status(400).json(response);
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await VoucherService.updateVoucher(id, req.body);

    if (response.status === "ERR") {
      const status = response.message === "Voucher not found" ? 404 : 400;
      return res.status(status).json(response);
    }

    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await VoucherService.deleteVoucher(id);

    if (response.status === "ERR") {
      const status = response.message === "Voucher not found" ? 404 : 400;
      return res.status(status).json(response);
    }

    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherDetail,
  getVoucherByCode,
  previewVoucherDiscount,
  updateVoucher,
  deleteVoucher,
};
