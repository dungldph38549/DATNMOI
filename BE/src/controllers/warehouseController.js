// ================================================================
// controllers/warehouseController.js
// ================================================================
const svc = require("../services/warehouseService.js");

const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data) => res.status(200).json({ success: true, data });
const created = (res, data) => res.status(201).json({ success: true, data });

exports.getAll = catchAsync(async (req, res) =>
  ok(res, await svc.getAll(req.query)),
);
exports.getById = catchAsync(async (req, res) =>
  ok(res, await svc.getById(req.params.id)),
);
exports.getWarehouseStock = catchAsync(async (req, res) =>
  ok(res, await svc.getWarehouseStock(req.params.id, req.query)),
);
exports.create = catchAsync(async (req, res) =>
  created(res, await svc.create(req.body)),
);
exports.update = catchAsync(async (req, res) =>
  ok(res, await svc.update(req.params.id, req.body)),
);
exports.deactivate = catchAsync(async (req, res) =>
  ok(res, await svc.deactivate(req.params.id)),
);
