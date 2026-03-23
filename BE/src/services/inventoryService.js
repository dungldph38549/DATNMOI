// ================================================================
// services/inventoryService.js
// Toàn bộ business logic tồn kho — controller gọi vào đây
// ================================================================
const Inventory = require("../models/Inventory");
const Product = require("../models/ProductModel");
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
  // Backward-compatible:
  // - Có productId: trả theo sản phẩm
  // - Không có productId: trả toàn bộ inventory (tránh 500 cho các màn cũ gọi /api/inventory)
  if (!productId) {
    return Inventory.find({})
      .populate("productId", "name")
      .populate("warehouses.warehouseId", "name code location")
      .sort({ status: 1, sku: 1 })
      .lean();
  }
  if (!isValid(productId)) throw new AppError("productId không hợp lệ");
  return Inventory.getByProduct(productId);
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
  const normalizedSku = String(sku || "").trim().toUpperCase();
  if (!normalizedSku) throw new AppError("SKU là bắt buộc");

  const existedBySku = await Inventory.findOne({ sku: normalizedSku });
  if (existedBySku) throw new AppError(`SKU "${normalizedSku}" đã tồn tại`, 409);

  const product = await Product.findById(productId).select("hasVariants variants.sku");
  if (!product) throw new AppError("Không tìm thấy sản phẩm", 404);

  let resolvedVariantId = variantId || null;
  if (product.hasVariants) {
    const matchedVariant = (product.variants || []).find(
      (v) => String(v?.sku || "").trim().toUpperCase() === normalizedSku,
    );
    if (!matchedVariant) {
      throw new AppError(
        `SKU "${normalizedSku}" không thuộc sản phẩm đã chọn`,
        422,
      );
    }
    resolvedVariantId = matchedVariant._id;
  } else {
    resolvedVariantId = null;
    const existedBase = await Inventory.findOne({ productId, variantId: null });
    if (existedBase) {
      throw new AppError(
        "Sản phẩm không biến thể chỉ có thể có một bản ghi tồn kho",
        409,
      );
    }
  }

  try {
    const inv = await Inventory.create({
      productId,
      variantId: resolvedVariantId,
      sku: normalizedSku,
      lowStockThreshold: lowStockThreshold || 10,
    });
    return inv;
  } catch (err) {
    if (err?.code === 11000) {
      throw new AppError("Bản ghi tồn kho đã tồn tại cho sản phẩm/biến thể này", 409);
    }
    throw err;
  }
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

// ── GET /api/inventory/admin/list  — Danh sách tồn kho (admin) ─
const getList = async ({ status, q } = {}) => {
  const Product = require("../models/ProductModel");
  const filter = {};
  if (status) filter.status = status;
  if (q && q.trim()) {
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const productIds = await Product.find({ name: regex }).distinct("_id");
    filter.$or = [{ sku: regex }];
    if (productIds.length) filter.$or.push({ productId: { $in: productIds } });
  }
  const items = await Inventory.find(filter)
    .populate("productId", "name")
    .populate("warehouses.warehouseId", "name code location")
    .sort({ status: 1, sku: 1 })
    .lean();
  return items;
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

const exportBySku = async (sku, qty, orderId, userId, warehouseId, note) => {
  const inv = await Inventory.findOne({ sku });
  if (!inv) throw new AppError(`SKU "${sku}" không tồn tại`, 404);
  await inv.exportStock(Number(qty), warehouseId, orderId, userId, note);
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
  getList,
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
  exportBySku,
};
