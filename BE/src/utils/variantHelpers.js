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

module.exports = {
  normalizeSku,
  orderAttributesFromVariant,
  findVariantBySku,
};
