/**
 * Index unique cũ { topUpId: 1 } (kèm sparse) vẫn chặn nhiều doc có topUpId: null → E11000 dup key.
 * Xóa index cũ không có partialFilterExpression, rồi sync theo schema mới.
 */
const WalletTransaction = require("../models/WalletTransactionModel.js");

async function syncWalletTransactionIndexes() {
  const coll = WalletTransaction.collection;
  let indexes;
  try {
    indexes = await coll.indexes();
  } catch (e) {
    console.warn("[wallettransactions] Không đọc được indexes:", e?.message);
    indexes = [];
  }
  for (const idx of indexes) {
    const key = idx.key || {};
    const names = Object.keys(key);
    if (
      names.length === 1 &&
      names[0] === "topUpId" &&
      idx.unique &&
      !idx.partialFilterExpression
    ) {
      try {
        await coll.dropIndex(idx.name);
        console.log(
          `[wallettransactions] Đã xóa index cũ (trùng null topUpId): ${idx.name}`,
        );
      } catch (err) {
        console.warn(
          `[wallettransactions] Không xóa được ${idx.name}:`,
          err?.message || err,
        );
      }
    }
  }
  await WalletTransaction.syncIndexes();
  console.log("[wallettransactions] Index topUpId đã đồng bộ (unique chỉ khi có giá trị).");
}

module.exports = { syncWalletTransactionIndexes };
