const mongoose = require("mongoose");
const Banner = require("../models/BannerModel");

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const validatePayload = (payload, { isUpdate = false } = {}) => {
  if (!payload || typeof payload !== "object") {
    return "Dữ liệu banner không hợp lệ";
  }
  if (!isUpdate) {
    if (!String(payload.title || "").trim()) return "Tiêu đề banner là bắt buộc";
    if (!String(payload.image || "").trim()) return "Ảnh banner là bắt buộc";
  }
  if (payload.link !== undefined && !isValidUrl(String(payload.link || "").trim())) {
    return "Liên kết đích không hợp lệ";
  }
  if (payload.image !== undefined && !isValidUrl(String(payload.image || "").trim())) {
    return "Đường dẫn ảnh không hợp lệ";
  }

  const startDate = normalizeDate(payload.startDate);
  const endDate = normalizeDate(payload.endDate);
  if (payload.startDate !== undefined && payload.startDate !== "" && !startDate) {
    return "Ngày bắt đầu không hợp lệ";
  }
  if (payload.endDate !== undefined && payload.endDate !== "" && !endDate) {
    return "Ngày kết thúc không hợp lệ";
  }
  if (startDate && endDate && endDate < startDate) {
    return "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu";
  }
  return null;
};

const getPublicBanners = async () => {
  const now = new Date();
  const data = await Banner.find({
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  return { status: "OK", message: "Lấy banner thành công", data };
};

const getAllBannersAdmin = async () => {
  const data = await Banner.find({}).sort({ order: 1, createdAt: -1 }).lean();
  return { status: "OK", message: "Lấy tất cả banner thành công", data };
};

const createBanner = async (payload) => {
  const err = validatePayload(payload);
  if (err) return { status: "ERR", message: err };

  const banner = await Banner.create({
    title: String(payload.title || "").trim(),
    subtitle: String(payload.subtitle || "").trim(),
    image: String(payload.image || "").trim(),
    link: String(payload.link || "").trim(),
    order: Number(payload.order || 0),
    isActive: payload.isActive !== false,
    startDate: normalizeDate(payload.startDate),
    endDate: normalizeDate(payload.endDate),
  });
  return { status: "OK", message: "Tạo banner thành công", data: banner };
};

const updateBanner = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: "ERR", message: "ID banner không hợp lệ" };
  }
  const err = validatePayload(payload, { isUpdate: true });
  if (err) return { status: "ERR", message: err };

  const update = {};
  if (payload.title !== undefined) update.title = String(payload.title || "").trim();
  if (payload.subtitle !== undefined) update.subtitle = String(payload.subtitle || "").trim();
  if (payload.image !== undefined) update.image = String(payload.image || "").trim();
  if (payload.link !== undefined) update.link = String(payload.link || "").trim();
  if (payload.order !== undefined) update.order = Number(payload.order || 0);
  if (payload.isActive !== undefined) update.isActive = Boolean(payload.isActive);
  if (payload.startDate !== undefined) update.startDate = normalizeDate(payload.startDate);
  if (payload.endDate !== undefined) update.endDate = normalizeDate(payload.endDate);

  const data = await Banner.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!data) return { status: "ERR", message: "Không tìm thấy banner" };
  return { status: "OK", message: "Cập nhật banner thành công", data };
};

const deleteBanner = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: "ERR", message: "ID banner không hợp lệ" };
  }
  const data = await Banner.findByIdAndDelete(id);
  if (!data) return { status: "ERR", message: "Không tìm thấy banner" };
  return { status: "OK", message: "Xóa banner thành công" };
};

const toggleBanner = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: "ERR", message: "ID banner không hợp lệ" };
  }
  const banner = await Banner.findById(id);
  if (!banner) return { status: "ERR", message: "Không tìm thấy banner" };
  banner.isActive = !banner.isActive;
  await banner.save();
  return {
    status: "OK",
    message: banner.isActive ? "Đã bật banner" : "Đã tắt banner",
    data: banner,
  };
};

const reorderBanners = async (payload) => {
  const items = Array.isArray(payload?.items) ? payload.items : payload;
  if (!Array.isArray(items) || items.length === 0) {
    return { status: "ERR", message: "Danh sách sắp xếp không hợp lệ" };
  }

  const ops = [];
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    const id = String(it?.id || it?._id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: "ERR", message: "Có banner không hợp lệ trong danh sách sắp xếp" };
    }
    const order = it?.order != null ? Number(it.order) : i;
    ops.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } },
      },
    });
  }

  if (ops.length > 0) {
    await Banner.bulkWrite(ops);
  }
  const data = await Banner.find({}).sort({ order: 1, createdAt: -1 }).lean();
  return { status: "OK", message: "Cập nhật thứ tự banner thành công", data };
};

module.exports = {
  getPublicBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBanner,
  reorderBanners,
};
