// ================================================================
// services/warehouseService.js
// ================================================================
const Warehouse = require("../models/Warehouse");
const Inventory = require("../models/Inventory");
const mongoose = require("mongoose");

const isValid = (id) => mongoose.isValidObjectId(id);

class AppError extends Error {
  constructor(msg, status = 400) {
    super(msg);
    this.status = status;
  }
}

// GET /api/warehouses
const getAll = async ({ includeInactive = false } = {}) => {
  return includeInactive
    ? Warehouse.find().populate("manager", "name email")
    : Warehouse.getActive();
};

// GET /api/warehouses/:id
const getById = async (id) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const wh = await Warehouse.findById(id).populate("manager", "name email");
  if (!wh) throw new AppError("Không tìm thấy kho", 404);
  return wh;
};

// GET /api/warehouses/:id/stock — tồn kho trong kho này
const getWarehouseStock = async (id, { page = 1, limit = 20 } = {}) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");

  const [items, total] = await Promise.all([
    Inventory.find({ "warehouses.warehouseId": id })
      .select(
        "sku productId variantId totalQuantity totalReserved status warehouses",
      )
      .populate("productId", "name images")
      .lean(),
    Inventory.countDocuments({ "warehouses.warehouseId": id }),
  ]);

  // Chỉ lấy stock của kho này
  const mapped = items.map((inv) => {
    const wh = inv.warehouses.find((w) => w.warehouseId.toString() === id);
    return {
      sku: inv.sku,
      productId: inv.productId,
      variantId: inv.variantId,
      status: inv.status,
      quantity: wh?.quantity ?? 0,
      reserved: wh?.reserved ?? 0,
      available: Math.max(0, (wh?.quantity ?? 0) - (wh?.reserved ?? 0)),
    };
  });

  return {
    items: mapped,
    meta: {
      total,
      page: +page,
      limit: +limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// POST /api/warehouses
const create = async (body) => {
  const existed = await Warehouse.findOne({ code: body.code?.toUpperCase() });
  if (existed) throw new AppError(`Mã kho "${body.code}" đã tồn tại`, 409);

  // Nếu set isDefault, bỏ default kho cũ
  if (body.isDefault) await Warehouse.updateMany({}, { isDefault: false });

  return Warehouse.create(body);
};

// PATCH /api/warehouses/:id
const update = async (id, body) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  if (body.isDefault)
    await Warehouse.updateMany({ _id: { $ne: id } }, { isDefault: false });
  const wh = await Warehouse.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });
  if (!wh) throw new AppError("Không tìm thấy kho", 404);
  return wh;
};

// DELETE /api/warehouses/:id (soft: set isActive = false)
const deactivate = async (id) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const wh = await Warehouse.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );
  if (!wh) throw new AppError("Không tìm thấy kho", 404);
  return { id, deactivated: true };
};

module.exports = {
  getAll,
  getById,
  getWarehouseStock,
  create,
  update,
  deactivate,
};
