/**
 * Index unique cũ chỉ { productId, userId } chặn đánh giá khi mua lại.
 * Xóa mọi index unique chỉ gồm hai field đó (không có orderId), rồi sync schema.
 */
const Review = require("../models/Review");

function isLegacyProductUserUniqueIndex(indexSpec) {
  if (!indexSpec || indexSpec.name === "_id_") return false;
  if (!indexSpec.unique) return false;
  const key = indexSpec.key || {};
  const names = Object.keys(key);
  if (names.length !== 2) return false;
  if (!names.includes("productId") || !names.includes("userId")) return false;
  if (names.includes("orderId")) return false;
  return true;
}

async function syncReviewIndexes() {
  const coll = Review.collection;
  let indexes;
  try {
    indexes = await coll.indexes();
  } catch (e) {
    console.warn("[reviews] Không đọc được indexes:", e?.message);
    indexes = [];
  }
  for (const idx of indexes) {
    if (!isLegacyProductUserUniqueIndex(idx)) continue;
    try {
      await coll.dropIndex(idx.name);
      console.log(`[reviews] Đã xóa index cũ (chặn mua lại): ${idx.name}`);
    } catch (err) {
      console.warn(`[reviews] Không xóa được ${idx.name}:`, err?.message || err);
    }
  }
  const fallback = ["productId_1_userId_1", "userId_1_productId_1"];
  for (const name of fallback) {
    try {
      await coll.dropIndex(name);
      console.log(`[reviews] Đã xóa index: ${name}`);
    } catch (err) {
      const msg = String(err?.message || "");
      if (!/not found|ns not found/i.test(msg) && err?.code !== 27) {
        /* ignore */
      }
    }
  }
  await Review.syncIndexes();
  console.log("[reviews] Index đã đồng bộ (mỗi lần mua = một đánh giá; mua lại = đánh giá thêm).");
}

module.exports = { syncReviewIndexes };
