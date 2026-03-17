const syncSvc = require("./erpSyncService");

const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data) => res.status(200).json({ success: true, data });

// ── Controller ────────────────────────────────────────────────

// POST /api/sync/erp/pull  — admin kéo thủ công toàn bộ
exports.pullAll = catchAsync(async (req, res) => {
  const result = await syncSvc.pullFromERP();
  ok(res, result);
});

// POST /api/sync/erp/pull/:sku  — kéo 1 SKU
exports.pullSku = catchAsync(async (req, res) => {
  const result = await syncSvc.pullSkuFromERP(req.params.sku);
  ok(res, result);
});

// POST /api/sync/erp/webhook  — ERP đẩy vào (public với signature)
exports.webhook = catchAsync(async (req, res) => {
  const signature = req.headers["x-erp-signature"];
  const result = await syncSvc.handleERPWebhook(req.body, signature);
  ok(res, result);
});
