const ShoelaceSize = require("../models/ShoelaceSizeModel");

const createShoelaceSize = async (body) => {
  const { name } = body;
  if (!name) {
    return { status: "ERR", message: "The name is required" };
  }
  const trimmed = name.trim();
  const dup = await ShoelaceSize.findOne({ name: trimmed });
  if (dup) {
    return { status: "ERR", message: "Kích thước dây giày này đã tồn tại" };
  }
  const created = await ShoelaceSize.create({ name: trimmed });
  return { status: "OK", message: "SUCCESS", data: created };
};

const updateShoelaceSize = async (id, data) => {
  const existing = await ShoelaceSize.findOne({ _id: id });
  if (!existing) {
    return { status: "ERR", message: "Không tìm thấy kích thước dây giày" };
  }
  if (data?.name != null) {
    const trimmed = String(data.name).trim();
    const dup = await ShoelaceSize.findOne({
      name: trimmed,
      _id: { $ne: id },
    });
    if (dup) {
      return { status: "ERR", message: "Tên này đã được dùng" };
    }
    data = { ...data, name: trimmed };
  }
  const updated = await ShoelaceSize.findByIdAndUpdate(id, data, { new: true });
  return { status: "OK", message: "SUCCESS", data: updated };
};

const deleteShoelaceSize = async (id) => {
  const existing = await ShoelaceSize.findOne({ _id: id });
  if (!existing) {
    return { status: "ERR", message: "Không tìm thấy kích thước dây giày" };
  }
  await ShoelaceSize.findByIdAndDelete(id);
  return { status: "OK", message: "Delete success" };
};

const getAllShoelaceSize = async () => {
  const list = await ShoelaceSize.find().sort({ createdAt: -1, updatedAt: -1 });
  return { status: "OK", message: "Success", data: list };
};

const getDetailShoelaceSize = async (id) => {
  const row = await ShoelaceSize.findOne({ _id: id });
  if (!row) {
    return { status: "ERR", message: "Không tìm thấy kích thước dây giày" };
  }
  return { status: "OK", message: "SUCCESS", data: row };
};

module.exports = {
  createShoelaceSize,
  updateShoelaceSize,
  deleteShoelaceSize,
  getAllShoelaceSize,
  getDetailShoelaceSize,
};
