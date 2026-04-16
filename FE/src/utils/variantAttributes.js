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

/** Accessory size: common admin column names, then plain Size. */
export function getVariantAccessorySizeValue(variant) {
  const v = readVariantAttribute(variant, [
    "Size",
    "size",
    "C\u1ee1",
    "Co",
    "Size gi\u00e0y",
    "Size gi\u1ea7y",
    "C\u1ee1 gi\u00e0y",
    "K\u00edch c\u1ee1",
  ]);
  if (v != null && String(v).trim() !== "") return v;
  return getVariantSizeValue(variant);
}

/** Shoelace / lace length from variant attributes (many possible admin column names). */
export function getVariantShoelaceLengthValue(variant) {
  return readVariantAttribute(variant, [
    "\u0110\u1ed9 d\u00e0i d\u00e2y",
    "\u0110\u1ed9 d\u00e0i",
    "Do dai day",
    "Do dai",
    "Chi\u1ec1u d\u00e0i d\u00e2y",
    "Chieu dai day",
    "K\u00edch th\u01b0\u1edbc d\u00e2y",
    "Kich thuoc day",
    "Length",
    "D\u00e0i d\u00e2y",
    "Dai day",
    "Shoelace length",
    "Size d\u00e2y",
    "Size day",
  ]);
}

/** Lace color: prefer explicit lace keys, else Color / Mau. */
export function getVariantLaceColorValue(variant) {
  const lace = readVariantAttribute(variant, [
    "M\u00e0u d\u00e2y",
    "Mau day",
    "M\u00e0u gi\u00e0y",
    "Mau giay",
    "Lace color",
    "M\u00e0u s\u1eafc d\u00e2y",
  ]);
  if (lace != null && String(lace).trim() !== "") return lace;
  return getVariantColorValue(variant);
}

/** Loại đế / đế giày (lót giày, phụ kiện) — nhiều tên cột có thể dùng. */
export function getVariantSoleValue(variant) {
  return readVariantAttribute(variant, [
    "\u0110\u1ebf gi\u00e0y",
    "\u0110\u1ebf gi\u1ea7y",
    "De giay",
    "De giai",
    "Lo\u1ea1i \u0111\u1ebf",
    "Loai de",
    "Sole",
    "Outsole",
    "Insole",
  ]);
}
