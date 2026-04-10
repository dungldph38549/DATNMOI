/** Normalize attribute keys so Color, color, Màu, etc. match. */
const normalizeAttrKey = (k) =>
  String(k || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

function variantAttributeEntries(attributes) {
  if (!attributes) return [];
  if (typeof attributes.entries === "function") {
    try {
      return Array.from(attributes.entries());
    } catch {
      /* fall through */
    }
  }
  if (typeof attributes === "object") return Object.entries(attributes);
  return [];
}

function readVariantAttribute(variant, keyAliases) {
  const wanted = new Set(keyAliases.map((a) => normalizeAttrKey(a)));
  for (const [k, v] of variantAttributeEntries(variant?.attributes)) {
    if (!wanted.has(normalizeAttrKey(k))) continue;
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

/** Color value from variant.attributes (Map or plain object from API). */
export function getVariantColorValue(variant) {
  return readVariantAttribute(variant, ["Color", "Màu", "Mau"]);
}

/** Size value from variant.attributes. */
export function getVariantSizeValue(variant) {
  return readVariantAttribute(variant, ["Size"]);
}
