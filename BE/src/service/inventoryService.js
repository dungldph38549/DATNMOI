// ================================================================
// services/inventoryService.js
// Toàn bộ business logic tồn kho — controller gọi vào đây
// ================================================================
const Inventory = require("../models/Inventory");
const mongoose = require("mongoose");
const { emitStockUpdate } = require("../socket/inventorySocket");
const { sendLowStockAlert } = require("../jobs/alertJob");

const isValid = (id) => mongoose.isValidObjectId(id);

class AppError extends Error {
  constructor(msg, status = 400) {
    super(msg);
    this.status = status;
  }
}

// ── GET /api/inventory?productId= ────────────────────────────
const getByProduct = async (productId) => {
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  const items = await Inventory.getByProduct(productId);
  return items;
};

// ── GET /api/inventory/:id ────────────────────────────────────
const getById = async (id) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id).populate(
    "warehouses.warehouseId",
    "name location",
  );
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);
  return inv;
};

// ── GET /api/inventory/sku/:sku ───────────────────────────────
const getBySku = async (sku) => {
  const inv = await Inventory.findOne({ sku });
  if (!inv) throw new AppError("SKU không tồn tại", 404);
  return inv;
};

// ── POST /api/inventory  — Tạo mới ───────────────────────────
const createInventory = async ({
  productId,
  variantId,
  sku,
  lowStockThreshold,
}) => {
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  const existed = await Inventory.findOne({ sku });
  if (existed) throw new AppError(`SKU "${sku}" đã tồn tại`, 409);

  const inv = await Inventory.create({
    productId,
    variantId: variantId || null,
    sku,
    lowStockThreshold: lowStockThreshold || 10,
  });
  return inv;
};

// ── POST /api/inventory/:id/import  — Nhập kho ───────────────
const importStock = async (id, { qty, warehouseId, note }, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id);
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);

  await inv.importStock(Number(qty), warehouseId, userId, note);

  // Emit realtime sau khi cập nhật
  emitStockUpdate({
    inventoryId: id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });
  return inv;
};

// ── POST /api/inventory/:id/export  — Xuất kho ───────────────
const exportStock = async (id, { qty, warehouseId, orderId, note }, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id);
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);

  await inv.exportStock(Number(qty), warehouseId, orderId, userId, note);

  emitStockUpdate({
    inventoryId: id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });

  // Cảnh báo low stock nếu cần
  if (inv.status === "low_stock" && !inv.alertSent) {
    await sendLowStockAlert(inv);
    inv.alertSent = true;
    await inv.save();
  }

  return inv;
};

// ── POST /api/inventory/:id/reserve  — Giữ hàng khi đặt đơn ─
const reserveStock = async (id, { qty, orderId }, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id);
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);

  await inv.reserveStock(Number(qty), orderId, userId);
  emitStockUpdate({
    inventoryId: id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });
  return inv;
};

// ── POST /api/inventory/:id/release  — Hủy giữ hàng ─────────
const releaseReserve = async (id, { qty, orderId }, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id);
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);

  await inv.releaseReserve(Number(qty), orderId, userId);
  emitStockUpdate({
    inventoryId: id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });
  return inv;
};

// ── PATCH /api/inventory/:id/adjust  — Điều chỉnh thủ công ──
const adjustStock = async (id, { newQty, warehouseId, note }, userId) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id);
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);

  await inv.adjustStock(Number(newQty), warehouseId, userId, note);
  emitStockUpdate({
    inventoryId: id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });
  return inv;
};

// ── POST /api/inventory/:id/transfer  — Chuyển kho ───────────
const transferStock = async (
  id,
  { qty, fromWarehouseId, toWarehouseId, note },
  userId,
) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id);
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);

  await inv.transferStock(
    Number(qty),
    fromWarehouseId,
    toWarehouseId,
    userId,
    note,
  );
  emitStockUpdate({
    inventoryId: id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });
  return inv;
};

// ── GET /api/inventory/low-stock  — Hàng sắp hết ─────────────
const getLowStock = async () => {
  return Inventory.getLowStock();
};

// ── GET /api/inventory/:id/logs  — Lịch sử giao dịch ─────────
const getAuditLogs = async (id, { page = 1, limit = 20, type } = {}) => {
  if (!isValid(id)) throw new AppError("ID không hợp lệ");
  const inv = await Inventory.findById(id).select("auditLogs sku");
  if (!inv) throw new AppError("Không tìm thấy inventory", 404);

  let logs = [...inv.auditLogs].reverse(); // mới nhất lên đầu
  if (type) logs = logs.filter((l) => l.type === type);

  const total = logs.length;
  const items = logs.slice((page - 1) * limit, page * limit);

  return {
    items,
    meta: {
      total,
      page: +page,
      limit: +limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// ── Dùng nội bộ (Order service gọi) — reserve khi tạo đơn ────
const reserveBySku = async (sku, qty, orderId, userId) => {
  const inv = await Inventory.findOne({ sku });
  if (!inv) throw new AppError(`SKU "${sku}" không tồn tại`, 404);
  await inv.reserveStock(qty, orderId, userId);
  emitStockUpdate({
    inventoryId: inv._id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });
  return inv;
};

const releaseBySku = async (sku, qty, orderId, userId) => {
  const inv = await Inventory.findOne({ sku });
  if (!inv) throw new AppError(`SKU "${sku}" không tồn tại`, 404);
  await inv.releaseReserve(qty, orderId, userId);
  emitStockUpdate({
    inventoryId: inv._id,
    sku: inv.sku,
    available: inv.available,
    status: inv.status,
  });
  return inv;
};

module.exports = {
  getByProduct,
  getById,
  getBySku,
  createInventory,
  importStock,
  exportStock,
  reserveStock,
  releaseReserve,
  adjustStock,
  transferStock,
  getLowStock,
  getAuditLogs,
  // internal
  reserveBySku,
  releaseBySku,
};
