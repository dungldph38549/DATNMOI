const mongoose = require("mongoose");
const Voucher = require("../models/VoucherModel");

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const validateVoucherBusiness = ({
  discountType,
  discountValue,
  startDate,
  endDate,
}) => {
  if (!["percent", "fixed"].includes(discountType || "percent")) {
    return "discountType phải là percent hoặc fixed";
  }
  if (discountType === "percent" && Number(discountValue) > 100) {
    return "Mã giảm theo % không được vượt quá 100";
  }
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) {
    return "Ngày bắt đầu/kết thúc không hợp lệ";
  }
  if (end < start) {
    return "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu";
  }
  return null;
};

const createVoucher = async (newVoucher) => {
  try {
    if (!newVoucher || typeof newVoucher !== "object") {
      return {
        status: "ERR",
        message: "Invalid voucher payload",
      };
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      startDate,
      endDate,
      usageLimit,
      status,
    } = newVoucher;

    if (!code || discountValue === undefined || !startDate || !endDate) {
      return {
        status: "ERR",
        message: "Missing required fields: code, discountValue, startDate, endDate",
      };
    }

    const numericDiscountValue = Number(discountValue);
    const numericMinOrderValue =
      minOrderValue !== undefined && minOrderValue !== null
        ? Number(minOrderValue)
        : 0;
    const numericUsageLimit =
      usageLimit !== undefined && usageLimit !== null
        ? Number(usageLimit)
        : 0;

    if (Number.isNaN(numericDiscountValue) || numericDiscountValue < 0) {
      return {
        status: "ERR",
        message: "discountValue must be a non-negative number",
      };
    }

    if (Number.isNaN(numericMinOrderValue) || numericMinOrderValue < 0) {
      return {
        status: "ERR",
        message: "minOrderValue must be a non-negative number",
      };
    }

    if (Number.isNaN(numericUsageLimit) || numericUsageLimit < 0) {
      return {
        status: "ERR",
        message: "usageLimit must be a non-negative number",
      };
    }

    const businessError = validateVoucherBusiness({
      discountType: discountType || "percent",
      discountValue: numericDiscountValue,
      startDate,
      endDate,
    });
    if (businessError) {
      return {
        status: "ERR",
        message: businessError,
      };
    }

    const existing = await Voucher.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return {
        status: "ERR",
        message: "Voucher code already exists",
      };
    }

    const createdVoucher = await Voucher.create({
      code: code.trim().toUpperCase(),
      description,
      discountType: discountType || "percent",
      discountValue: numericDiscountValue,
      minOrderValue: numericMinOrderValue,
      startDate,
      endDate,
      usageLimit: numericUsageLimit,
      status: status || "active",
    });

    return {
      status: "OK",
      message: "SUCCESS",
      data: createdVoucher,
    };
  } catch (e) {
    throw e;
  }
};

const getAllVouchers = async () => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 });
    return {
      status: "OK",
      message: "SUCCESS",
      data: vouchers,
    };
  } catch (e) {
    throw e;
  }
};

const getVoucherDetail = async (voucherId) => {
  try {
    if (!voucherId || !mongoose.Types.ObjectId.isValid(voucherId)) {
      return {
        status: "ERR",
        message: "Invalid voucher id",
      };
    }

    const voucher = await Voucher.findById(voucherId);
    if (!voucher) {
      return {
        status: "ERR",
        message: "Voucher not found",
      };
    }

    return {
      status: "OK",
      message: "SUCCESS",
      data: voucher,
    };
  } catch (e) {
    throw e;
  }
};

const updateVoucher = async (voucherId, updateData) => {
  try {
    if (!voucherId || !mongoose.Types.ObjectId.isValid(voucherId)) {
      return {
        status: "ERR",
        message: "Invalid voucher id",
      };
    }

    if (!updateData || typeof updateData !== "object") {
      return {
        status: "ERR",
        message: "Invalid update payload",
      };
    }

    const voucher = await Voucher.findById(voucherId);
    if (!voucher) {
      return {
        status: "ERR",
        message: "Voucher not found",
      };
    }

    const payload = {};

    if (updateData.code !== undefined) {
      payload.code = updateData.code.trim().toUpperCase();
    }
    if (updateData.description !== undefined) {
      payload.description = updateData.description;
    }
    if (updateData.discountType !== undefined) {
      payload.discountType = updateData.discountType;
    }
    if (updateData.startDate !== undefined) {
      payload.startDate = updateData.startDate;
    }
    if (updateData.endDate !== undefined) {
      payload.endDate = updateData.endDate;
    }
    if (updateData.status !== undefined) {
      payload.status = updateData.status;
    }

    if (updateData.discountValue !== undefined) {
      const num = Number(updateData.discountValue);
      if (Number.isNaN(num) || num < 0) {
        return {
          status: "ERR",
          message: "discountValue must be a non-negative number",
        };
      }
      payload.discountValue = num;
    }

    if (updateData.minOrderValue !== undefined) {
      const num = Number(updateData.minOrderValue);
      if (Number.isNaN(num) || num < 0) {
        return {
          status: "ERR",
          message: "minOrderValue must be a non-negative number",
        };
      }
      payload.minOrderValue = num;
    }

    if (updateData.usageLimit !== undefined) {
      const num = Number(updateData.usageLimit);
      if (Number.isNaN(num) || num < 0) {
        return {
          status: "ERR",
          message: "usageLimit must be a non-negative number",
        };
      }
      payload.usageLimit = num;
    }

    if (payload.code) {
      const duplicate = await Voucher.findOne({
        code: payload.code,
        _id: { $ne: voucherId },
      });
      if (duplicate) {
        return {
          status: "ERR",
          message: "Voucher code already exists",
        };
      }
    }

    const finalDiscountType = payload.discountType ?? voucher.discountType;
    const finalDiscountValue = payload.discountValue ?? voucher.discountValue;
    const finalStartDate = payload.startDate ?? voucher.startDate;
    const finalEndDate = payload.endDate ?? voucher.endDate;
    const businessError = validateVoucherBusiness({
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      startDate: finalStartDate,
      endDate: finalEndDate,
    });
    if (businessError) {
      return {
        status: "ERR",
        message: businessError,
      };
    }

    const updated = await Voucher.findByIdAndUpdate(
      voucherId,
      { $set: payload },
      { new: true, runValidators: true }
    );

    return {
      status: "OK",
      message: "SUCCESS",
      data: updated,
    };
  } catch (e) {
    throw e;
  }
};

const deleteVoucher = async (voucherId) => {
  try {
    if (!voucherId || !mongoose.Types.ObjectId.isValid(voucherId)) {
      return {
        status: "ERR",
        message: "Invalid voucher id",
      };
    }

    const result = await Voucher.findByIdAndDelete(voucherId);
    if (!result) {
      return {
        status: "ERR",
        message: "Voucher not found",
      };
    }

    return {
      status: "OK",
      message: "Delete voucher success",
    };
  } catch (e) {
    throw e;
  }
};

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherDetail,
  updateVoucher,
  deleteVoucher,
};

