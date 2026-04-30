const mongoose = require("mongoose");
const Voucher = require("../models/VoucherModel");
const Product = require("../models/ProductModel");

// --- Canonical đọc (tương thích document cũ) ---

const canonicalType = (doc) =>
  doc.type || doc.discountType || "percent";

const canonicalValue = (doc) => Number(doc.value ?? doc.discountValue ?? 0);

const canonicalMaxDiscount = (doc) =>
  Number(doc.maxDiscount ?? doc.maxDiscountAmount ?? 0);

const canonicalIsActive = (doc) => {
  if (doc.isActive === true || doc.isActive === false) return Boolean(doc.isActive);
  return doc.status === "active";
};

const applicableProductIdList = (doc) => {
  const a = doc.applicableProducts || doc.applicableProductIds || [];
  if (!Array.isArray(a)) return [];
  return [...new Set(a.map((id) => String(id)))].filter(Boolean);
};

const applicableCategoryIdList = (doc) => {
  const a = doc.applicableCategories || [];
  if (!Array.isArray(a)) return [];
  return [...new Set(a.map((id) => String(id)))].filter(Boolean);
};

/**
 * Tính số tiền giảm (áp dụng trần maxDiscount khi type=percent).
 */
const computeFinalVoucherDiscountAmount = (voucherDoc, eligibleSubtotal) => {
  const eligible = Math.max(0, Number(eligibleSubtotal) || 0);
  const t = canonicalType(voucherDoc);
  const val = canonicalValue(voucherDoc);
  const rawDiscount =
    t === "fixed" ? val : (eligible * val) / 100;
  let discountAmount = Math.max(0, Math.min(eligible, rawDiscount));
  const maxCap = canonicalMaxDiscount(voucherDoc);
  if (t === "percent" && maxCap > 0) {
    discountAmount = Math.min(discountAmount, maxCap);
  }
  return discountAmount;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeSku = (value) => String(value || "").trim().toUpperCase();

const isAdminOrStaff = (user) => Boolean(user?.isAdmin || user?.isStaff);

const canUserSeeOwnerVoucher = (voucherDoc, actorUser) => {
  const ownerId = voucherDoc?.ownerUserId ? String(voucherDoc.ownerUserId) : "";
  if (!ownerId) return true;
  if (isAdminOrStaff(actorUser)) return true;
  if (!actorUser?.id) return false;
  return String(actorUser.id) === ownerId;
};

const normalizeObjectIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Map(
      value
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => [id, new mongoose.Types.ObjectId(id)]),
    ).values(),
  ];
};

const normalizeOwnerUserId = (value) => {
  const raw = String(value || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
};

const countUsesByAccount = (voucherDoc, userId, guestId) => {
  const list = voucherDoc.usedBy || [];
  if (userId) {
    const uid = String(userId);
    return list.filter((e) => e.userId && String(e.userId) === uid).length;
  }
  const gid = String(guestId || "").trim();
  if (!gid) return 0;
  return list.filter((e) => e.guestId && String(e.guestId) === gid).length;
};

const usageLimitCanonical = (doc) => {
  const n = Number(doc.usageLimit);
  if (!Number.isFinite(n) || n < 0) return 1;
  return n;
};

const userLimitCanonical = (doc) => {
  const n = Number(doc.userLimit);
  if (!Number.isFinite(n) || n < 0) return 1;
  return n;
};

/** Bổ sung categoryId cho từng dòng giỏ (để kiểm tra applicableCategories) */
const enrichLineItemsWithCategories = async (lineItems) => {
  const ids = [
    ...new Set(
      lineItems
        .map((item) => String(item?.productId || item?._id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ];
  if (!ids.length) {
    return lineItems.map((item) => ({
      productId: String(item?.productId || item?._id || "").trim(),
      sku: normalizeSku(item?.sku),
      price: Number(item?.price) || 0,
      quantity: Number(item?.quantity ?? item?.qty) || 0,
      categoryId: null,
    }));
  }
  const products = await Product.find({ _id: { $in: ids } })
    .select("categoryId")
    .lean();
  const byId = Object.fromEntries(
    products.map((p) => [
      String(p._id),
      p.categoryId ? String(p.categoryId) : null,
    ]),
  );
  return lineItems.map((item) => {
    const pid = String(item?.productId || item?._id || "").trim();
    return {
      productId: pid,
      sku: normalizeSku(item?.sku),
      price: Number(item?.price) || 0,
      quantity: Number(item?.quantity ?? item?.qty) || 0,
      categoryId: byId[pid] || null,
    };
  });
};

/**
 * Kiểm tra voucher + tính discountAmount (không ghi DB).
 * Trả { status:'OK', data } hoặc { status:'ERR', message }.
 */
const evaluateVoucherDiscount = async ({
  voucherDoc,
  actorUser,
  userId,
  guestId,
  items,
  voucherTarget,
  orderValueOverride,
}) => {
  if (!voucherDoc) {
    return { status: "ERR", message: "Voucher không tồn tại" };
  }
  if (!canUserSeeOwnerVoucher(voucherDoc, actorUser)) {
    return {
      status: "ERR",
      message: "Voucher này không áp dụng cho tài khoản hiện tại",
    };
  }
  if (voucherDoc.isDeleted) {
    return { status: "ERR", message: "Voucher không tồn tại" };
  }
  if (!canonicalIsActive(voucherDoc)) {
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
    return { status: "ERR", message: "Voucher hết hạn" };
  }

  const usageLimit = usageLimitCanonical(voucherDoc);
  const usedCount = Number(voucherDoc.usedCount ?? 0);
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return { status: "ERR", message: "Voucher đã hết lượt sử dụng" };
  }

  const userLimit = userLimitCanonical(voucherDoc);
  const usedByUser = countUsesByAccount(voucherDoc, userId, guestId);
  if (userLimit > 0 && usedByUser >= userLimit) {
    return { status: "ERR", message: "Bạn đã dùng voucher này" };
  }

  const lineItems = Array.isArray(items) ? items : [];
  const normalizedItems = await enrichLineItemsWithCategories(lineItems);

  const computedSubtotal = normalizedItems.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  );
  const orderValue =
    orderValueOverride != null && orderValueOverride !== ""
      ? Number(orderValueOverride)
      : computedSubtotal;

  const minOrderValue = Number(voucherDoc.minOrderValue ?? 0);
  if (orderValue < minOrderValue) {
    return {
      status: "ERR",
      message: `Đơn tối thiểu ${minOrderValue.toLocaleString("vi-VN")}đ`,
    };
  }

  const productIds = applicableProductIdList(voucherDoc);
  const categoryIds = applicableCategoryIdList(voucherDoc);
  const hasProductScope = productIds.length > 0;
  const hasCategoryScope = categoryIds.length > 0;
  const hasScope = hasProductScope || hasCategoryScope;

  const inScope = (item) => {
    if (!item.productId || item.quantity <= 0) return false;
    if (!hasScope) return true;
    let ok = false;
    if (hasProductScope && productIds.includes(String(item.productId))) {
      ok = true;
    }
    if (
      hasCategoryScope &&
      item.categoryId &&
      categoryIds.includes(String(item.categoryId))
    ) {
      ok = true;
    }
    return ok;
  };

  const eligibleTargets = normalizedItems.filter(inScope).map((item) => ({
    productId: item.productId,
    sku: item.sku || null,
    quantity: item.quantity,
    unitPrice: item.price,
    lineTotal: item.price * item.quantity,
  }));

  const eligibleSubtotal = hasScope
    ? normalizedItems.reduce((sum, item) => {
        if (!inScope(item)) return sum;
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }, 0)
    : computedSubtotal;

  if (hasScope && eligibleSubtotal <= 0) {
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
          isPersonalVoucher,
          hasProductScope: hasScope,
          isWholeOrderVoucher: !isPersonalVoucher && !hasScope,
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

    discountBaseAmount = Number(selectedTarget.unitPrice || 0);
  }

  const discountAmount = computeFinalVoucherDiscountAmount(
    voucherDoc,
    discountBaseAmount,
  );

  return {
    status: "OK",
    message: "SUCCESS",
    data: {
      discountAmount,
      requiresProductSelection: isPersonalVoucher,
      isPersonalVoucher,
      hasProductScope: hasScope,
      isWholeOrderVoucher: !isPersonalVoucher && !hasScope,
      eligibleTargets,
      selectedTarget,
    },
  };
};

const createVoucher = async (newVoucher) => {
  if (!newVoucher || typeof newVoucher !== "object") {
    return { status: "ERR", message: "Dữ liệu voucher không hợp lệ" };
  }

  const {
    code,
    description,
    type,
    value,
    maxDiscount,
    minOrderValue,
    startDate,
    endDate,
    usageLimit,
    userLimit,
    isActive,
    applicableProducts,
    applicableCategories,
    ownerUserId,
    discountType,
    discountValue,
    maxDiscountAmount,
  } = newVoucher;

  const effectiveType = type || discountType || "percent";
  const effectiveValue =
    value !== undefined && value !== null ? value : discountValue;
  const effectiveMax =
    maxDiscount !== undefined && maxDiscount !== null
      ? maxDiscount
      : maxDiscountAmount;

  if (!code || effectiveValue === undefined || !startDate || !endDate) {
    return {
      status: "ERR",
      message: "Thiếu trường bắt buộc: code, value, startDate, endDate",
    };
  }

  const numericValue = Number(effectiveValue);
  const numericMin =
    minOrderValue !== undefined && minOrderValue !== null
      ? Number(minOrderValue)
      : 0;
  const numericMax =
    effectiveMax !== undefined && effectiveMax !== null
      ? Number(effectiveMax)
      : 0;
  const numericUsage =
    usageLimit !== undefined && usageLimit !== null
      ? Number(usageLimit)
      : 1;
  const numericUserLimit =
    userLimit !== undefined && userLimit !== null ? Number(userLimit) : 1;

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return { status: "ERR", message: "Giá trị giảm không hợp lệ" };
  }
  if (effectiveType === "percent" && (numericValue < 1 || numericValue > 100)) {
    return { status: "ERR", message: "Giá trị % phải từ 1 đến 100" };
  }
  if (Number.isNaN(numericMin) || numericMin < 0) {
    return { status: "ERR", message: "Đơn tối thiểu không hợp lệ" };
  }
  if (Number.isNaN(numericMax) || numericMax < 0) {
    return { status: "ERR", message: "Giảm tối đa không hợp lệ" };
  }

  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) {
    return { status: "ERR", message: "Ngày bắt đầu/kết thúc không hợp lệ" };
  }
  if (end < start) {
    return {
      status: "ERR",
      message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
    };
  }

  const existing = await Voucher.findOne({ code: code.trim().toUpperCase() });
  if (existing && !existing.isDeleted) {
    return { status: "ERR", message: "Mã voucher đã tồn tại" };
  }

  const createdVoucher = await Voucher.create({
    code: code.trim().toUpperCase(),
    description,
    type: effectiveType,
    value: numericValue,
    maxDiscount: numericMax,
    minOrderValue: numericMin,
    startDate,
    endDate,
    usageLimit: Number.isNaN(numericUsage) || numericUsage < 0 ? 1 : numericUsage,
    userLimit:
      Number.isNaN(numericUserLimit) || numericUserLimit < 0
        ? 1
        : numericUserLimit,
    isActive: isActive !== false,
    isDeleted: false,
    applicableProducts: normalizeObjectIdArray(applicableProducts),
    applicableCategories: normalizeObjectIdArray(applicableCategories),
    ownerUserId: normalizeOwnerUserId(ownerUserId),
  });

  return { status: "OK", message: "SUCCESS", data: createdVoucher };
};

const getActiveVouchers = async (actorUser = null) => {
  const now = new Date();
  const stillHasQuota = {
    $or: [
      { usageLimit: 0 },
      {
        $expr: {
          $lt: ["$usedCount", { $ifNull: ["$usageLimit", 1] }],
        },
      },
    ],
  };
  const ownerFilter = actorUser?.id
    ? {
        $or: [
          { ownerUserId: null },
          { ownerUserId: new mongoose.Types.ObjectId(actorUser.id) },
        ],
      }
    : { ownerUserId: null };

  const query = {
    isDeleted: false,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $and: [stillHasQuota, ownerFilter],
  };

  const vouchers = await Voucher.find(query).sort({ createdAt: -1 });
  return { status: "OK", message: "SUCCESS", data: vouchers };
};

const getAllVouchersAdmin = async () => {
  const vouchers = await Voucher.find({ isDeleted: false }).sort({
    createdAt: -1,
  });
  return { status: "OK", message: "SUCCESS", data: vouchers };
};

const getAllVouchers = async (actorUser = null) => {
  /** @deprecated — dùng getActiveVouchers / getAllVouchersAdmin */
  if (isAdminOrStaff(actorUser)) {
    return getAllVouchersAdmin();
  }
  return getActiveVouchers(actorUser);
};

const getVoucherDetail = async (voucherId, actorUser = null) => {
  if (!voucherId || !mongoose.Types.ObjectId.isValid(voucherId)) {
    return { status: "ERR", message: "Mã voucher không hợp lệ" };
  }

  const voucher = await Voucher.findOne({
    _id: voucherId,
    isDeleted: false,
  });
  if (!voucher) {
    return { status: "ERR", message: "Không tìm thấy voucher" };
  }
  if (!canUserSeeOwnerVoucher(voucher, actorUser)) {
    return { status: "ERR", message: "Không tìm thấy voucher" };
  }

  return { status: "OK", message: "SUCCESS", data: voucher };
};

const previewVoucherDiscount = async (body, actorUser = null) => {
  try {
    const { code, items, voucherTarget, orderValue } = body || {};
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return { status: "ERR", message: "Thiếu mã voucher" };
    }

    const voucherDoc = await Voucher.findOne({
      code: normalizedCode,
      isDeleted: false,
    });
    const userId = actorUser?.id || null;
    return evaluateVoucherDiscount({
      voucherDoc,
      actorUser,
      userId,
      guestId: body?.guestId || null,
      items,
      voucherTarget,
      orderValueOverride: orderValue,
    });
  } catch (e) {
    return { status: "ERR", message: e.message || "Lỗi tính giảm giá" };
  }
};

const applyVoucher = async (body, actorUser = null) => {
  const res = await previewVoucherDiscount(body, actorUser);
  if (res.status === "ERR") return res;

  const subtotal = Array.isArray(body?.items)
    ? body.items.reduce(
        (sum, item) =>
          sum +
          (Number(item?.price) || 0) *
            (Number(item?.quantity ?? item?.qty) || 0),
        0,
      )
    : 0;
  const orderValue =
    body?.orderValue != null && body?.orderValue !== ""
      ? Number(body.orderValue)
      : subtotal;
  const discount = Number(res.data?.discountAmount ?? 0);
  const shipping = Number(body?.shippingFee ?? 0);
  const finalPrice = Math.max(0, orderValue - discount + shipping);

  return {
    status: "OK",
    message: "Áp dụng voucher thành công",
    discount,
    finalPrice,
    data: {
      ...res.data,
      discount,
      discountAmount: discount,
      finalPrice,
      orderValue,
    },
  };
};

const getVoucherByCode = async (code, actorUser = null) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) {
    return { status: "ERR", message: "Thiếu mã voucher" };
  }

  const voucher = await Voucher.findOne({
    code: normalizedCode,
    isDeleted: false,
  });
  if (!voucher) {
    return { status: "ERR", message: "Không tìm thấy voucher" };
  }
  if (!canUserSeeOwnerVoucher(voucher, actorUser)) {
    return { status: "ERR", message: "Không tìm thấy voucher" };
  }

  return { status: "OK", message: "SUCCESS", data: voucher };
};

const updateVoucher = async (voucherId, updateData) => {
  if (!voucherId || !mongoose.Types.ObjectId.isValid(voucherId)) {
    return { status: "ERR", message: "Mã voucher không hợp lệ" };
  }
  if (!updateData || typeof updateData !== "object") {
    return { status: "ERR", message: "Dữ liệu cập nhật không hợp lệ" };
  }

  const voucher = await Voucher.findOne({ _id: voucherId, isDeleted: false });
  if (!voucher) {
    return { status: "ERR", message: "Không tìm thấy voucher" };
  }

  const payload = {};

  if (updateData.code !== undefined) {
    payload.code = String(updateData.code).trim().toUpperCase();
  }
  if (updateData.description !== undefined) {
    payload.description = updateData.description;
  }
  if (updateData.type !== undefined) {
    payload.type = updateData.type;
  }
  if (updateData.discountType !== undefined && updateData.type === undefined) {
    payload.type = updateData.discountType;
  }
  if (updateData.value !== undefined) {
    payload.value = Number(updateData.value);
  }
  if (updateData.discountValue !== undefined && updateData.value === undefined) {
    payload.value = Number(updateData.discountValue);
  }
  if (updateData.maxDiscount !== undefined) {
    payload.maxDiscount = Number(updateData.maxDiscount);
  }
  if (
    updateData.maxDiscountAmount !== undefined &&
    updateData.maxDiscount === undefined
  ) {
    payload.maxDiscount = Number(updateData.maxDiscountAmount);
  }
  if (updateData.startDate !== undefined) {
    payload.startDate = updateData.startDate;
  }
  if (updateData.endDate !== undefined) {
    payload.endDate = updateData.endDate;
  }
  if (updateData.isActive !== undefined) {
    payload.isActive = Boolean(updateData.isActive);
  }
  if (updateData.status !== undefined && updateData.isActive === undefined) {
    payload.isActive = updateData.status === "active";
  }
  if (updateData.minOrderValue !== undefined) {
    payload.minOrderValue = Number(updateData.minOrderValue);
  }
  if (updateData.usageLimit !== undefined) {
    payload.usageLimit = Number(updateData.usageLimit);
  }
  if (updateData.userLimit !== undefined) {
    payload.userLimit = Number(updateData.userLimit);
  }
  if (updateData.applicableProducts !== undefined) {
    payload.applicableProducts = normalizeObjectIdArray(
      updateData.applicableProducts,
    );
  }
  if (updateData.applicableProductIds !== undefined) {
    payload.applicableProducts = normalizeObjectIdArray(
      updateData.applicableProductIds,
    );
  }
  if (updateData.applicableCategories !== undefined) {
    payload.applicableCategories = normalizeObjectIdArray(
      updateData.applicableCategories,
    );
  }
  if (updateData.ownerUserId !== undefined) {
    payload.ownerUserId = normalizeOwnerUserId(updateData.ownerUserId);
  }

  if (payload.code) {
    const duplicate = await Voucher.findOne({
      code: payload.code,
      _id: { $ne: voucherId },
      isDeleted: false,
    });
    if (duplicate) {
      return { status: "ERR", message: "Mã voucher đã tồn tại" };
    }
  }

  const merged = { ...voucher.toObject(), ...payload };
  const t = merged.type || merged.discountType || "percent";
  const v = Number(merged.value ?? merged.discountValue);
  if (t === "percent" && (v < 1 || v > 100)) {
    return { status: "ERR", message: "Giá trị % phải từ 1 đến 100" };
  }

  const updated = await Voucher.findByIdAndUpdate(
    voucherId,
    { $set: payload },
    { new: true, runValidators: true },
  );

  return { status: "OK", message: "SUCCESS", data: updated };
};

const deleteVoucher = async (voucherId) => {
  if (!voucherId || !mongoose.Types.ObjectId.isValid(voucherId)) {
    return { status: "ERR", message: "Mã voucher không hợp lệ" };
  }

  const updated = await Voucher.findByIdAndUpdate(
    voucherId,
    { $set: { isDeleted: true, isActive: false } },
    { new: true },
  );
  if (!updated) {
    return { status: "ERR", message: "Không tìm thấy voucher" };
  }

  return { status: "OK", message: "Đã xóa voucher" };
};

const toggleVoucherActive = async (voucherId) => {
  if (!voucherId || !mongoose.Types.ObjectId.isValid(voucherId)) {
    return { status: "ERR", message: "Mã voucher không hợp lệ" };
  }
  const v = await Voucher.findOne({ _id: voucherId, isDeleted: false });
  if (!v) {
    return { status: "ERR", message: "Không tìm thấy voucher" };
  }
  const next = !canonicalIsActive(v);
  const updated = await Voucher.findByIdAndUpdate(
    voucherId,
    { $set: { isActive: next } },
    { new: true },
  );
  return { status: "OK", message: "SUCCESS", data: updated };
};

/**
 * Ghi nhận đã dùng voucher (sau thanh toán thành công / tạo đơn COD, ví).
 * Idempotent theo orderId.
 */
const useVoucher = async (
  { code, userId, guestId, orderId },
  session = null,
) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode || !orderId) {
    throw new Error("Thiếu mã voucher hoặc mã đơn hàng");
  }

  const oid = new mongoose.Types.ObjectId(orderId);
  const opts = session ? { session, new: true } : { new: true };

  const already = await Voucher.findOne({
    code: normalizedCode,
    "usedBy.orderId": oid,
  }).session(session || null);
  if (already) {
    return { status: "OK", message: "Đã ghi nhận trước đó", data: already };
  }

  const voucher = await Voucher.findOne({
    code: normalizedCode,
    isDeleted: false,
  }).session(session || null);
  if (!voucher) {
    throw new Error("Voucher không tồn tại");
  }

  const usageLimit = usageLimitCanonical(voucher);
  const usedCount = Number(voucher.usedCount ?? 0);
  if (usageLimit > 0 && usedCount >= usageLimit) {
    throw new Error("Voucher đã hết lượt sử dụng");
  }

  const userLimit = userLimitCanonical(voucher);
  const usedByUser = countUsesByAccount(voucher, userId, guestId);
  if (userLimit > 0 && usedByUser >= userLimit) {
    throw new Error("Bạn đã dùng voucher này");
  }

  const entry = {
    userId: userId ? new mongoose.Types.ObjectId(userId) : null,
    guestId: userId ? null : String(guestId || "").trim() || null,
    orderId: oid,
    usedAt: new Date(),
  };

  const filter = {
    code: normalizedCode,
    isDeleted: false,
    usedBy: { $not: { $elemMatch: { orderId: oid } } },
  };
  if (usageLimit > 0) {
    filter.usedCount = { $lt: usageLimit };
  }

  const updated = await Voucher.findOneAndUpdate(
    filter,
    { $inc: { usedCount: 1 }, $push: { usedBy: entry } },
    opts,
  );

  if (!updated) {
    const retry = await Voucher.findOne({
      code: normalizedCode,
      "usedBy.orderId": oid,
    }).session(session || null);
    if (retry) {
      return { status: "OK", message: "Đã ghi nhận trước đó", data: retry };
    }
    throw new Error("Voucher đã hết lượt sử dụng");
  }

  return { status: "OK", message: "SUCCESS", data: updated };
};

const releaseVoucherForOrder = async ({ code, orderId }, session = null) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode || !orderId) return { status: "OK" };

  const oid = new mongoose.Types.ObjectId(orderId);
  const has = await Voucher.findOne({
    code: normalizedCode,
    "usedBy.orderId": oid,
  }).session(session || null);
  if (!has) return { status: "OK" };

  await Voucher.findOneAndUpdate(
    { code: normalizedCode },
    {
      $pull: { usedBy: { orderId: oid } },
      $inc: { usedCount: -1 },
    },
    { session: session || undefined },
  );

  await Voucher.findOneAndUpdate(
    { code: normalizedCode, usedCount: { $lt: 0 } },
    { $set: { usedCount: 0 } },
    { session: session || undefined },
  );

  return { status: "OK" };
};

module.exports = {
  computeFinalVoucherDiscountAmount,
  canonicalType,
  canonicalValue,
  canonicalMaxDiscount,
  canonicalIsActive,
  applicableProductIdList,
  applicableCategoryIdList,
  countUsesByAccount,
  usageLimitCanonical,
  userLimitCanonical,
  evaluateVoucherDiscount,
  enrichLineItemsWithCategories,
  createVoucher,
  getActiveVouchers,
  getAllVouchersAdmin,
  getAllVouchers,
  getVoucherDetail,
  getVoucherByCode,
  previewVoucherDiscount,
  applyVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucherActive,
  useVoucher,
  releaseVoucherForOrder,
};
