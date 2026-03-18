// ================================================================
// controllers/inventoryController.js
// Chỉ đọc req/res — delegate toàn bộ sang inventoryService
// ================================================================
const svc = require("../services/inventoryService.js");

const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });
const created = (res, data) => ok(res, data, 201);

// GET /api/inventory?productId=
exports.getByProduct = catchAsync(async (req, res) => {
  ok(res, await svc.getByProduct(req.query.productId));
});

// GET /api/inventory/low-stock
exports.getLowStock = catchAsync(async (req, res) => {
  ok(res, await svc.getLowStock());
});

// GET /api/inventory/admin/list (admin only — đăng ký route sau authAdminMiddleware)
exports.getList = catchAsync(async (req, res) => {
  ok(res, await svc.getList(req.query));
});

// GET /api/inventory/sku/:sku
exports.getBySku = catchAsync(async (req, res) => {
  ok(res, await svc.getBySku(req.params.sku));
});

// GET /api/inventory/:id
exports.getById = catchAsync(async (req, res) => {
  ok(res, await svc.getById(req.params.id));
});

// GET /api/inventory/:id/logs?page=&limit=&type=
exports.getAuditLogs = catchAsync(async (req, res) => {
  ok(res, await svc.getAuditLogs(req.params.id, req.query));
});

// POST /api/inventory
exports.create = catchAsync(async (req, res) => {
  created(res, await svc.createInventory(req.body));
});

// POST /api/inventory/:id/import
exports.import = catchAsync(async (req, res) => {
  ok(res, await svc.importStock(req.params.id, req.body, req.user._id));
});

// POST /api/inventory/:id/export
exports.export = catchAsync(async (req, res) => {
  ok(res, await svc.exportStock(req.params.id, req.body, req.user._id));
});

// POST /api/inventory/:id/reserve
exports.reserve = catchAsync(async (req, res) => {
  ok(res, await svc.reserveStock(req.params.id, req.body, req.user._id));
});

// POST /api/inventory/:id/release
exports.release = catchAsync(async (req, res) => {
  ok(res, await svc.releaseReserve(req.params.id, req.body, req.user._id));
});

// PATCH /api/inventory/:id/adjust
exports.adjust = catchAsync(async (req, res) => {
  ok(res, await svc.adjustStock(req.params.id, req.body, req.user._id));
});

// POST /api/inventory/:id/transfer
exports.transfer = catchAsync(async (req, res) => {
  ok(res, await svc.transferStock(req.params.id, req.body, req.user._id));
});
