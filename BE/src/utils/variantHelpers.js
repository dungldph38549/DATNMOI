const Product = require("../models/ProductModel");

/**
 * Chuẩn hóa SKU để so khớp (uppercase, trim).
 */
function normalizeSku(sku) {
  if (sku == null) return "";
  return String(sku).trim().toUpperCase();
}

/**
 * Thuộc tính lưu trên dòng đơn (Size / Color) — hỗ trợ biến thể mới và bản ghi cũ (Map).
 */
function orderAttributesFromVariant(variant) {
  if (!variant) return {};

  if (variant.attributes instanceof Map) {
    return Object.fromEntries(variant.attributes);
  }
  if (
    variant.attributes &&
    typeof variant.attributes === "object" &&
    !Array.isArray(variant.attributes)
  ) {
    const plain = { ...variant.attributes };
    if (Object.keys(plain).length > 0) return plain;
  }

  const o = {};
  if (variant.size != null && String(variant.size).trim() !== "") {
    o.Size = String(variant.size).trim();
  }
  if (variant.colorName != null && String(variant.colorName).trim() !== "") {
    o.Color = String(variant.colorName).trim();
  }
  return o;
}

/**
 * Tìm biến thể theo SKU đã chuẩn hóa.
 */
function findVariantBySku(variants, sku) {
  const want = normalizeSku(sku);
  if (!want || !Array.isArray(variants)) return null;
  return variants.find((v) => normalizeSku(v?.sku) === want) || null;
}

/**
 * Đặt tồn kho biến thể (SKU đúng như trong DB) — dùng updateOne để không chạy
 * validate toàn bộ Product (tránh lỗi khi có biến thể cũ thiếu size nhưng vẫn cần trừ tồn).
 */
async function setVariantStockAt(productId, exactVariantSku, nextStock, session = null) {
  const next = Math.max(0, Number(nextStock) || 0);
  const opts = session ? { session } : {};
  const res = await Product.updateOne(
    { _id: productId, "variants.sku": exactVariantSku },
    { $set: { "variants.$.stock": next } },
    opts,
  );
  if (res.matchedCount === 0) {
    const e = new Error(
      `Không cập nhật được tồn kho cho biến thể (SKU: ${exactVariantSku})`,
    );
    e.statusCode = 400;
    throw e;
  }
}

/**
 * Cộng/trừ tồn kho biến thể theo SKU đúng trong DB.
 * @returns {boolean} đã khớp và cập nhật ít nhất một bản ghi
 */
async function incrementVariantStockAt(
  productId,
  exactVariantSku,
  delta,
  session = null,
) {
  const opts = session ? { session } : {};
  const res = await Product.updateOne(
    { _id: productId, "variants.sku": exactVariantSku },
    { $inc: { "variants.$.stock": Number(delta) || 0 } },
    opts,
  );
  return res.matchedCount > 0;
}

module.exports = {
  normalizeSku,
  orderAttributesFromVariant,
  findVariantBySku,
  setVariantStockAt,
  incrementVariantStockAt,
};
