const axios = require("axios"); // npm install axios
const Inventory = require("../models/Inventory");
const Warehouse = require("../models/Warehouse");
const { emitSyncDone } = require("../socket/inventorySocket");

// ── Cấu hình từ .env ─────────────────────────────────────────
const ERP_CONFIG = {
  baseURL: process.env.ERP_BASE_URL || "https://erp.example.com/api",
  apiKey: process.env.ERP_API_KEY || "",
  timeout: Number(process.env.ERP_TIMEOUT) || 10000,
};

// Axios instance cho ERP
const erpClient = axios.create({
  baseURL: ERP_CONFIG.baseURL,
  timeout: ERP_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ERP_CONFIG.apiKey}`,
  },
});

// ── Kết quả sync ─────────────────────────────────────────────
const makeSyncResult = () => ({
  success: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  startAt: new Date(),
  endAt: null,
});

// ================================================================
// PULL: Kéo tồn kho từ ERP về — gọi định kỳ hoặc thủ công
// ================================================================

/**
 * Kéo toàn bộ tồn kho từ ERP
 * ERP trả về mảng: [{ sku, warehouseCode, quantity, updatedAt }]
 */
const pullFromERP = async () => {
  const result = makeSyncResult();
  console.log("[ERP Sync] Bắt đầu PULL từ ERP...");

  try {
    // 1. Lấy danh sách kho nội bộ để map warehouseCode → _id
    const warehouses = await Warehouse.find({
      externalType: "ERP",
      isActive: true,
    });
    const whMap = Object.fromEntries(warehouses.map((w) => [w.code, w._id]));

    // 2. Gọi API ERP
    const { data } = await erpClient.get("/inventory/stock-levels");
    const erpItems = data?.items || data || [];

    // 3. Xử lý từng item
    for (const item of erpItems) {
      try {
        const warehouseId = whMap[item.warehouseCode?.toUpperCase()];
        if (!warehouseId) {
          result.skipped++;
          result.errors.push({
            sku: item.sku,
            reason: `Không tìm thấy kho: ${item.warehouseCode}`,
          });
          continue;
        }

        let inv = await Inventory.findOne({ sku: item.sku });

        if (!inv) {
          // Tạo mới nếu chưa có
          inv = new Inventory({
            sku: item.sku,
            productId:
              item.productId || new require("mongoose").Types.ObjectId(),
            totalQuantity: 0,
          });
        }

        // So sánh để tránh update thừa
        const wh = inv.warehouses.find(
          (w) => w.warehouseId?.toString() === warehouseId.toString(),
        );
        const oldQty = wh?.quantity ?? 0;
        const newQty = Number(item.quantity) || 0;

        if (oldQty === newQty) {
          result.skipped++;
          continue;
        }

        const diff = newQty - oldQty;

        // Dùng adjustStock để có audit log
        if (wh) {
          await inv.adjustStock(
            inv.totalQuantity + diff,
            warehouseId,
            null,
            `[ERP Sync] ${item.warehouseCode} ${oldQty} → ${newQty}`,
          );
        } else {
          inv._syncWarehouseQty(warehouseId, diff);
          inv.totalQuantity = Math.max(0, inv.totalQuantity + diff);
          inv._recalcStatus();
          await inv.save();
        }

        result.success++;
      } catch (err) {
        result.failed++;
        result.errors.push({ sku: item.sku, reason: err.message });
      }
    }
  } catch (err) {
    console.error("[ERP Sync] Lỗi kết nối ERP:", err.message);
    result.errors.push({ reason: `Kết nối ERP thất bại: ${err.message}` });
  }

  result.endAt = new Date();
  console.log(
    `[ERP Sync] PULL xong: ✅ ${result.success} | ⏭ ${result.skipped} | ❌ ${result.failed}`,
  );

  // Notify realtime
  emitSyncDone(result);

  // Cập nhật lastSyncAt cho các kho
  await Warehouse.updateMany(
    { externalType: "ERP" },
    { lastSyncAt: new Date() },
  );

  return result;
};

/**
 * Kéo tồn kho 1 SKU cụ thể từ ERP (sync theo yêu cầu)
 */
const pullSkuFromERP = async (sku) => {
  const result = makeSyncResult();

  try {
    const { data } = await erpClient.get(`/inventory/stock-levels/${sku}`);
    if (!data) {
      result.skipped = 1;
      return result;
    }

    const warehouses = await Warehouse.find({
      externalType: "ERP",
      isActive: true,
    });
    const whMap = Object.fromEntries(warehouses.map((w) => [w.code, w._id]));

    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      const warehouseId = whMap[item.warehouseCode?.toUpperCase()];
      if (!warehouseId) {
        result.skipped++;
        continue;
      }

      const inv = await Inventory.findOne({ sku });
      if (!inv) {
        result.skipped++;
        continue;
      }

      const wh = inv.warehouses.find(
        (w) => w.warehouseId?.toString() === warehouseId.toString(),
      );
      const diff = Number(item.quantity) - (wh?.quantity ?? 0);

      if (diff !== 0) {
        inv.totalQuantity = Math.max(0, inv.totalQuantity + diff);
        inv._syncWarehouseQty(warehouseId, diff);
        inv._pushLog({
          type: "adjust",
          quantity: diff,
          beforeQty: inv.totalQuantity - diff,
          afterQty: inv.totalQuantity,
          warehouseId,
          note: "[ERP Sync]",
        });
        inv._recalcStatus();
        await inv.save();
        result.success++;
      } else {
        result.skipped++;
      }
    }
  } catch (err) {
    result.failed++;
    result.errors.push({ sku, reason: err.message });
  }

  result.endAt = new Date();
  return result;
};

// ================================================================
// PUSH: Đẩy thay đổi từ DB lên ERP (sau khi xuất kho)
// ================================================================

/**
 * Đẩy update tồn kho lên ERP sau khi có thay đổi nội bộ
 * @param {{ sku, warehouseCode, quantity, orderId? }} payload
 */
const pushToERP = async (payload) => {
  if (!ERP_CONFIG.apiKey) {
    console.warn("[ERP Push] API key chưa cấu hình — bỏ qua.");
    return false;
  }

  try {
    await erpClient.post("/inventory/update", {
      sku: payload.sku,
      warehouseCode: payload.warehouseCode,
      quantity: payload.quantity,
      updatedAt: new Date().toISOString(),
      source: "SHOP_SYSTEM",
      orderId: payload.orderId || null,
    });

    console.log(
      `[ERP Push] ✅ Đã đẩy lên ERP: ${payload.sku} = ${payload.quantity}`,
    );
    return true;
  } catch (err) {
    console.error(`[ERP Push] ❌ Thất bại: ${err.message}`);
    return false;
  }
};

// ================================================================
// WEBHOOK: Nhận dữ liệu ERP đẩy vào (POST /api/sync/erp-webhook)
// ================================================================

/**
 * Xử lý webhook ERP gửi đến — verify signature trước
 * @param {object} body  - payload từ ERP
 * @param {string} signature - header X-ERP-Signature
 */
const handleERPWebhook = async (body, signature) => {
  // Verify HMAC signature
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", process.env.ERP_WEBHOOK_SECRET || "secret")
    .update(JSON.stringify(body))
    .digest("hex");

  if (signature && signature !== `sha256=${expected}`) {
    throw { status: 401, message: "Webhook signature không hợp lệ" };
  }

  const result = makeSyncResult();
  const items = Array.isArray(body) ? body : body.items || [body];

  for (const item of items) {
    try {
      const inv = await Inventory.findOne({ sku: item.sku });
      if (!inv) {
        result.skipped++;
        continue;
      }

      const warehouses = await Warehouse.find({ externalType: "ERP" });
      const wh = warehouses.find(
        (w) => w.code === item.warehouseCode?.toUpperCase(),
      );
      if (!wh) {
        result.skipped++;
        continue;
      }

      await inv.adjustStock(
        Number(item.quantity),
        wh._id,
        null,
        `[ERP Webhook] ${item.warehouseCode}`,
      );

      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({ sku: item.sku, reason: err.message });
    }
  }

  result.endAt = new Date();
  emitSyncDone(result);
  return result;
};

// ================================================================
// CRON: Tự động sync định kỳ
// ================================================================
const scheduleSyncCron = () => {
  try {
    const cron = require("node-cron");
    // Sync mỗi 30 phút
    cron.schedule("*/30 * * * *", async () => {
      console.log("[ERP Sync Cron] Chạy định kỳ...");
      await pullFromERP();
    });
    console.log("[ERP Sync Cron] Đã đăng ký sync mỗi 30 phút.");
  } catch {
    console.warn("[ERP Sync Cron] node-cron chưa cài — bỏ qua.");
  }
};

module.exports = {
  pullFromERP,
  pullSkuFromERP,
  pushToERP,
  handleERPWebhook,
  scheduleSyncCron,
};
