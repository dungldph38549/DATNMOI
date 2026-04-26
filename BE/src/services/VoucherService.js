const mongoose = require("mongoose");
const Voucher = require("../models/VoucherModel");

/**
 * Tính số tiền giảm cuối cùng (có áp trần maxDiscountAmount nếu > 0).
 */
const computeFinalVoucherDiscountAmount = (voucherDoc, eligibleSubtotal) => {
  const eligible = Math.max(0, Number(eligibleSubtotal) || 0);
  const discountValue = Number(voucherDoc.discountValue ?? 0);
  const rawDiscount =
    voucherDoc.discountType === "fixed"
      ? discountValue
      : (eligible * discountValue) / 100;
  let discountAmount = Math.max(0, Math.min(eligible, rawDiscount));
  const maxCap = Number(voucherDoc.maxDiscountAmount ?? 0);
  if (maxCap > 0) {
    discountAmount = Math.min(discountAmount, maxCap);
  }
  return discountAmount;
};

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

const normalizeApplicableProductIds = (value) => {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((id) => String(id || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const unique = new Map();
  ids.forEach((id) => unique.set(String(id), id));
  return Array.from(unique.values());
};

const normalizeOwnerUserId = (value) => {
  const raw = String(value || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
};

const isAdminOrStaff = (user) => Boolean(user?.isAdmin || user?.isStaff);

const canUserUseVoucher = (voucherDoc, actorUser) => {
  const ownerId = voucherDoc?.ownerUserId ? String(voucherDoc.ownerUserId) : "";
  if (!ownerId) return true;
  if (isAdminOrStaff(actorUser)) return true;
  if (!actorUser?.id) return false;
  return String(actorUser.id) === ownerId;
};

const normalizeSku = (value) => String(value || "").trim().toUpperCase();

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
      maxDiscountAmount,
      startDate,
      endDate,
      usageLimit,
      status,
      applicableProductIds,
      ownerUserId,
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
    const numericMaxDiscount =
      maxDiscountAmount !== undefined && maxDiscountAmount !== null
        ? Number(maxDiscountAmount)
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

    if (Number.isNaN(numericMaxDiscount) || numericMaxDiscount < 0) {
      return {
        status: "ERR",
        message: "maxDiscountAmount must be a non-negative number",
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
      maxDiscountAmount: numericMaxDiscount,
      startDate,
      endDate,
      usageLimit: numericUsageLimit,
      status: status || "active",
      applicableProductIds: normalizeApplicableProductIds(applicableProductIds),
      ownerUserId: normalizeOwnerUserId(ownerUserId),
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

const getAllVouchers = async (actorUser = null) => {
  try {
    const query = isAdminOrStaff(actorUser)
      ? {}
      : actorUser?.id
        ? {
            $or: [
              { ownerUserId: null },
              { ownerUserId: new mongoose.Types.ObjectId(actorUser.id) },
            ],
          }
        : { ownerUserId: null };
    const vouchers = await Voucher.find(query).sort({ createdAt: -1 });
    return {
      status: "OK",
      message: "SUCCESS",
      data: vouchers,
    };
  } catch (e) {
    throw e;
  }
};

const getVoucherDetail = async (voucherId, actorUser = null) => {
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
    if (!canUserUseVoucher(voucher, actorUser)) {
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

const previewVoucherDiscount = async (body, actorUser = null) => {
  try {
    const { code, items, voucherTarget } = body || {};
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return { status: "ERR", message: "Thiếu mã voucher" };
    }

    const lineItems = Array.isArray(items) ? items : [];
    const normalizedItems = lineItems.map((item) => ({
      productId: String(item?.productId || item?._id || "").trim(),
      sku: normalizeSku(item?.sku),
      price: Number(item?.price) || 0,
      quantity: Number(item?.quantity ?? item?.qty) || 0,
    }));
    const computedSubtotal = lineItems.reduce(
      (sum, item) =>
        sum +
        (Number(item?.price) || 0) *
          (Number(item?.quantity ?? item?.qty) || 0),
      0,
    );

    const voucherDoc = await Voucher.findOne({ code: normalizedCode });
    if (!voucherDoc) {
      return { status: "ERR", message: "Voucher không tồn tại" };
    }
    if (!canUserUseVoucher(voucherDoc, actorUser)) {
      return { status: "ERR", message: "Voucher này không áp dụng cho tài khoản hiện tại" };
    }
    if (voucherDoc.status !== "active") {
      return { status: "ERR", message: "Voucher không hoạt động" };
    }

    const now = new Date();
    const start = voucherDoc.startDate ? new Date(voucherDoc.startDate) : null;
    const end = voucherDoc.endDate ? new Date(voucherDoc.endDate) : null;
    if (start && now < start) {
      const fromStr = start.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        status: "ERR",
        message: `Voucher chưa có hiệu lực. Có thể sử dụng từ ${fromStr}.`,
      };
    }
    if (end && now > end) {
      return { status: "ERR", message: "Voucher đã hết hạn" };
    }

    const minOrderValue = Number(voucherDoc.minOrderValue ?? 0);
    if (computedSubtotal < minOrderValue) {
      return {
        status: "ERR",
        message: `Đơn hàng tối thiểu để dùng voucher là ${minOrderValue.toLocaleString()} đ`,
      };
    }

    const usageLimit = Number(voucherDoc.usageLimit ?? 0);
    const usedCount = Number(voucherDoc.usedCount ?? 0);
    if (usageLimit !== 0 && usedCount >= usageLimit) {
      return { status: "ERR", message: "Voucher đã hết lượt sử dụng" };
    }

    const applicableIds = Array.isArray(voucherDoc.applicableProductIds)
      ? voucherDoc.applicableProductIds.map((id) => String(id))
      : [];
    const hasProductScope = applicableIds.length > 0;

    const eligibleTargets = normalizedItems
      .filter((item) => {
        if (!item.productId || item.quantity <= 0) return false;
        if (!hasProductScope) return true;
        return applicableIds.includes(item.productId);
      })
      .map((item) => ({
        productId: item.productId,
        sku: item.sku || null,
        quantity: item.quantity,
        lineTotal: item.price * item.quantity,
      }));

    const eligibleSubtotal = hasProductScope
      ? lineItems.reduce((sum, item) => {
          const pid = String(item?.productId || item?._id || "").trim();
          if (!applicableIds.includes(pid)) return sum;
          return (
            sum +
            (Number(item?.price) || 0) *
              (Number(item?.quantity ?? item?.qty) || 0)
          );
        }, 0)
      : computedSubtotal;

    if (hasProductScope && eligibleSubtotal <= 0) {
      return {
        status: "ERR",
        message: "Voucher này không áp dụng cho sản phẩm đã chọn",
      };
    }

    const isPersonalVoucher = Boolean(voucherDoc.ownerUserId);
    const selectedTargetProductId = String(voucherTarget?.productId || "").trim();
    const selectedTargetSku = normalizeSku(voucherTarget?.sku);

    let discountBaseAmount = eligibleSubtotal;
    let selectedTarget = null;

    if (isPersonalVoucher) {
      if (!selectedTargetProductId) {
        return {
          status: "OK",
          message: "SUCCESS",
          data: {
            discountAmount: 0,
            requiresProductSelection: true,
            eligibleTargets,
          },
        };
      }

      selectedTarget =
        eligibleTargets.find((target) => {
          if (target.productId !== selectedTargetProductId) return false;
          if (!selectedTargetSku) return true;
          return normalizeSku(target.sku) === selectedTargetSku;
        }) || null;

      if (!selectedTarget) {
        return {
          status: "ERR",
          message: "Sản phẩm chọn áp dụng voucher không hợp lệ",
        };
      }

      discountBaseAmount = Number(selectedTarget.lineTotal || 0);
    }

    const discountAmount = computeFinalVoucherDiscountAmount(voucherDoc, discountBaseAmount);

    return {
      status: "OK",
      message: "SUCCESS",
      data: {
        discountAmount,
        requiresProductSelection: isPersonalVoucher,
        isPersonalVoucher,
        hasProductScope,
        isWholeOrderVoucher: !isPersonalVoucher && !hasProductScope,
        eligibleTargets,
        selectedTarget,
      },
    };
  } catch (e) {
    return { status: "ERR", message: e.message || "Lỗi tính giảm giá" };
  }
};

const getVoucherByCode = async (code, actorUser = null) => {
  try {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return {
        status: "ERR",
        message: "Voucher code is required",
      };
    }

    const voucher = await Voucher.findOne({ code: normalizedCode });
    if (!voucher) {
      return {
        status: "ERR",
        message: "Voucher not found",
      };
    }
    if (!canUserUseVoucher(voucher, actorUser)) {
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
    if (updateData.applicableProductIds !== undefined) {
      payload.applicableProductIds = normalizeApplicableProductIds(
        updateData.applicableProductIds,
      );
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

    if (updateData.maxDiscountAmount !== undefined) {
      const num = Number(updateData.maxDiscountAmount);
      if (Number.isNaN(num) || num < 0) {
        return {
          status: "ERR",
          message: "maxDiscountAmount must be a non-negative number",
        };
      }
      payload.maxDiscountAmount = num;
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
  computeFinalVoucherDiscountAmount,
  createVoucher,
  getAllVouchers,
  getVoucherDetail,
  getVoucherByCode,
  previewVoucherDiscount,
  updateVoucher,
  deleteVoucher,
};

