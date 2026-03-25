const mongoose = require("mongoose");

// ================================================================
// SUB-SCHEMA: Stock theo từng kho
// ================================================================
const warehouseStockSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    quantity: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 }, // đang giữ cho đơn chờ
    lastSyncAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ================================================================
// SUB-SCHEMA: Audit Log (lịch sử nhập/xuất)
// ================================================================
const auditLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["import", "export", "adjust", "reserve", "release", "transfer"],
      required: true,
    },
    quantity: { type: Number, required: true }, // + nhập / - xuất
    beforeQty: { type: Number, required: true },
    afterQty: { type: Number, required: true },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    note: { type: String, default: null },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

// ================================================================
// MAIN SCHEMA: Inventory
// ================================================================
const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null }, // null = không có variant
    sku: { type: String, required: true, unique: true, trim: true },

    // ── Tổng toàn hệ thống ───────────────────────────────────────
    totalQuantity: { type: Number, default: 0, min: 0 },
    totalReserved: { type: Number, default: 0, min: 0 }, // đơn đang chờ xử lý

    // ── Tồn kho từng kho ────────────────────────────────────────
    warehouses: { type: [warehouseStockSchema], default: [] },

    // ── Ngưỡng cảnh báo ─────────────────────────────────────────
    lowStockThreshold: { type: Number, default: 10 },
    alertSent: { type: Boolean, default: false },

    // ── Trạng thái ──────────────────────────────────────────────
    status: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock",
      index: true,
    },

    // ── Audit log (giữ 500 bản ghi gần nhất) ────────────────────
    auditLogs: { type: [auditLogSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ================================================================
// INDEXES
// ================================================================
inventorySchema.index({ productId: 1, variantId: 1 }, { unique: true });
inventorySchema.index({ totalQuantity: 1 });

// ================================================================
// VIRTUALS
// ================================================================
// Số lượng thực tế có thể bán (trừ phần đang reserve)
inventorySchema.virtual("available").get(function () {
  return Math.max(0, this.totalQuantity - this.totalReserved);
});

// ================================================================
// INSTANCE METHODS
// ================================================================

/** Nhập kho */
inventorySchema.methods.importStock = function (
  qty,
  warehouseId,
  performedBy,
  note = "",
) {
  if (qty <= 0) throw new Error("Số lượng nhập phải lớn hơn 0");
  const before = this.totalQuantity;
  this.totalQuantity += qty;
  this._syncWarehouseQty(warehouseId, qty);
  this._pushLog({
    type: "import",
    quantity: qty,
    beforeQty: before,
    afterQty: this.totalQuantity,
    warehouseId,
    performedBy,
    note,
  });
  this._recalcStatus();
  return this.save();
};

/** Xuất kho (khi giao hàng hoàn tất) */
inventorySchema.methods.exportStock = function (
  qty,
  warehouseId,
  orderId,
  performedBy,
  note = "",
) {
  if (qty <= 0) throw new Error("Số lượng xuất phải lớn hơn 0");
  if (this.available < qty)
    throw new Error(`Không đủ hàng — khả dụng: ${this.available}`);
  const before = this.totalQuantity;
  this.totalQuantity -= qty;

  // Nếu không truyền warehouseId (ví dụ: xuất theo đơn mà FE chưa chọn kho),
  // thì phân bổ xuất từ các kho hiện có để dashboard theo kho vẫn khớp số lượng.
  if (warehouseId) {
    this._syncWarehouseQty(warehouseId, -qty);
  } else if (Array.isArray(this.warehouses) && this.warehouses.length > 0) {
    let remaining = qty;
    for (const wh of this.warehouses) {
      if (remaining <= 0) break;
      const take = Math.min(wh.quantity, remaining);
      wh.quantity = Math.max(0, wh.quantity - take);
      wh.lastSyncAt = new Date();
      remaining -= take;
    }

    if (remaining > 0) {
      throw new Error(`Không đủ hàng trong kho để xuất (thiếu: ${remaining})`);
    }
  }

  this._pushLog({
    type: "export",
    quantity: -qty,
    beforeQty: before,
    afterQty: this.totalQuantity,
    warehouseId: warehouseId ?? null,
    orderId,
    performedBy,
    note,
  });
  this._recalcStatus();
  return this.save();
};

/** Reserve (giữ hàng khi khách đặt đơn) */
inventorySchema.methods.reserveStock = function (qty, orderId, performedBy) {
  if (this.available < qty)
    throw new Error(`Không đủ hàng để đặt — khả dụng: ${this.available}`);
  const before = this.totalReserved;
  this.totalReserved += qty;
  this._pushLog({
    type: "reserve",
    quantity: qty,
    beforeQty: before,
    afterQty: this.totalReserved,
    orderId,
    performedBy,
  });
  this._recalcStatus();
  return this.save();
};

/** Release reserve (khi hủy đơn) */
inventorySchema.methods.releaseReserve = function (qty, orderId, performedBy) {
  const before = this.totalReserved;
  this.totalReserved = Math.max(0, this.totalReserved - qty);
  this._pushLog({
    type: "release",
    quantity: qty,
    beforeQty: before,
    afterQty: this.totalReserved,
    orderId,
    performedBy,
  });
  this._recalcStatus();
  return this.save();
};

/** Điều chỉnh thủ công (admin) */
inventorySchema.methods.adjustStock = function (
  newQty,
  warehouseId,
  performedBy,
  note,
) {
  const before = this.totalQuantity;
  const diff = newQty - before;
  this.totalQuantity = newQty;
  if (warehouseId) this._syncWarehouseQty(warehouseId, diff);
  this._pushLog({
    type: "adjust",
    quantity: diff,
    beforeQty: before,
    afterQty: newQty,
    warehouseId,
    performedBy,
    note,
  });
  this._recalcStatus();
  return this.save();
};

/** Chuyển kho */
inventorySchema.methods.transferStock = function (
  qty,
  fromId,
  toId,
  performedBy,
  note = "",
) {
  if (qty <= 0) throw new Error("Số lượng chuyển phải lớn hơn 0");
  this._syncWarehouseQty(fromId, -qty);
  this._syncWarehouseQty(toId, +qty);
  // totalQuantity không thay đổi khi chuyển kho nội bộ
  this._pushLog({
    type: "transfer",
    quantity: qty,
    beforeQty: this.totalQuantity,
    afterQty: this.totalQuantity,
    warehouseId: fromId,
    performedBy,
    note: `→ ${toId}. ${note}`,
  });
  return this.save();
};

// ── Private helpers ────────────────────────────────────────────
inventorySchema.methods._syncWarehouseQty = function (warehouseId, delta) {
  if (!warehouseId) return;
  const wh = this.warehouses.find(
    (w) => w.warehouseId.toString() === warehouseId.toString(),
  );
  if (wh) {
    wh.quantity = Math.max(0, wh.quantity + delta);
    wh.lastSyncAt = new Date();
  } else {
    this.warehouses.push({ warehouseId, quantity: Math.max(0, delta) });
  }
};

inventorySchema.methods._pushLog = function (data) {
  this.auditLogs.push(data);
  if (this.auditLogs.length > 500) this.auditLogs.shift(); // giữ 500 log mới nhất
};

inventorySchema.methods._recalcStatus = function () {
  const avail = this.available;
  if (avail <= 0) this.status = "out_of_stock";
  else if (avail <= this.lowStockThreshold) this.status = "low_stock";
  else this.status = "in_stock";
  if (this.status === "in_stock") this.alertSent = false;
};

// ================================================================
// STATIC METHODS
// ================================================================
inventorySchema.statics.getByProduct = function (productId) {
  return this.find({ productId }).populate(
    "warehouses.warehouseId",
    "name location",
  );
};

inventorySchema.statics.getLowStock = function () {
  return this.find({ status: { $in: ["low_stock", "out_of_stock"] } })
    .populate("productId", "name images")
    .sort({ totalQuantity: 1 });
};

// ================================================================
// PRE-SAVE HOOK
// ================================================================
inventorySchema.pre("save", function (next) {
  this._recalcStatus();
  next();
});

module.exports = mongoose.model("Inventory", inventorySchema);
