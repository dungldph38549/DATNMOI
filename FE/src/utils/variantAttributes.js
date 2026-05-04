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

/**
 * Giá trị `variant.size` có phải độ dài dây (cm/mm) hay không — tránh nhầm cỡ giày/lót 35–48.
 * Số thuần ≥60 thường là cm dây (90, 120…); có đơn vị cm/mm luôn coi là dây.
 */
export function variantSizeLooksLikeShoelaceLength(sz) {
  const raw = String(sz ?? "").trim();
  if (!raw) return false;
  if (/(\d\s*)?(cm|mm)\b/i.test(raw)) return true;
  if (/\b(inch|in)\b/i.test(raw.toLowerCase())) return true;
  const s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  if (/dai\s*day|do\s*dai|chieu\s*dai|length|shoelace/i.test(s)) return true;
  const m = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return false;
  const n = parseFloat(m[1].replace(",", "."));
  if (Number.isNaN(n)) return false;
  if (n >= 60) return true;
  return false;
}

/** Accessory size: common admin column names, then plain Size, rồi variant.size (không phải độ dài dây). */
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
  if (v != null && String(v).trim() !== "") return String(v).trim();
  const fromSizeAttr = getVariantSizeValue(variant);
  if (fromSizeAttr != null && String(fromSizeAttr).trim() !== "") return String(fromSizeAttr).trim();
  const sz = variant?.size;
  if (sz != null && String(sz).trim() !== "") {
    const t = String(sz).trim();
    if (!variantSizeLooksLikeShoelaceLength(t)) return t;
  }
  return null;
}

/**
 * Độ dài dây từ attribute hoặc `variant.size` (chỉ khi hợp ngữ cảnh SP / giá trị giống cm dây).
 * @param {object} variant
 * @param {object} [product] — nếu có: lót giày không dùng `size` làm độ dài dây.
 */
export function getVariantShoelaceLengthValue(variant, product) {
  const fromAttrs = readVariantAttribute(variant, [
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
  if (fromAttrs != null && String(fromAttrs).trim() !== "") return String(fromAttrs).trim();
  const sz = variant?.size;
  if (sz == null || String(sz).trim() === "") return null;
  const t = String(sz).trim();
  const kind = product ? inferAccessorySubKindFromProduct(product) : null;
  if (kind === "insole") return null;
  if (kind === "shoelace") return t;
  if (kind === "other" || kind == null) {
    if (variantSizeLooksLikeShoelaceLength(t)) return t;
    return null;
  }
  return null;
}

/** Lace color: prefer explicit lace keys, else Color / Mau, else colorName (schema BE). */
export function getVariantLaceColorValue(variant) {
  const lace = readVariantAttribute(variant, [
    "M\u00e0u d\u00e2y",
    "Mau day",
    "M\u00e0u gi\u00e0y",
    "Mau giay",
    "Lace color",
    "M\u00e0u s\u1eafc d\u00e2y",
  ]);
  if (lace != null && String(lace).trim() !== "") return String(lace).trim();
  const fromGeneric = getVariantColorValue(variant);
  if (fromGeneric != null && String(fromGeneric).trim() !== "") return String(fromGeneric).trim();
  const cn = variant?.colorName;
  if (cn != null && String(cn).trim() !== "") return String(cn).trim();
  return null;
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

const slugifyAccessoryHint = (str = "") =>
  String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

/**
 * Phân loại phụ kiện theo tên/slug danh mục (đồng bộ với AccessoriesPage).
 * @returns {"all"|"insole"|"shoelace"|"other"}
 */
export function inferAccessorySubKind(name = "", slug = "") {
  const s = `${slugifyAccessoryHint(name)} ${slugifyAccessoryHint(slug)}`.trim();
  if (!s) return "other";
  const shoelace =
    (s.includes("day") && s.includes("giay")) ||
    s.includes("shoelace") ||
    s.includes("day-giay") ||
    s.includes("day giay");
  const insole =
    (s.includes("lot") && s.includes("giay")) ||
    s.includes("lot-giay") ||
    s.includes("insole") ||
    (s.includes("lot") && !s.includes("day"));
  if (shoelace && !insole) return "shoelace";
  if (insole && !shoelace) return "insole";
  if (shoelace) return "shoelace";
  if (insole) return "insole";
  return "other";
}

/**
 * Loại phụ kiện cho một SP: ưu tiên tên danh mục con; nếu chỉ "Phụ kiện" chung thì suy từ tên SP.
 * @returns {"insole"|"shoelace"|"other"}
 */
export function inferAccessorySubKindFromProduct(product) {
  const cat = product?.categoryId;
  const catName = typeof cat === "object" && cat != null ? String(cat.name || "").trim() : "";
  const catSlug = typeof cat === "object" && cat != null ? String(cat.slug || "").trim() : "";
  const fromCat = inferAccessorySubKind(catName, catSlug);
  if (fromCat !== "other") return fromCat;
  const title = String(product?.name || "").trim();
  return inferAccessorySubKind(title, "");
}

/** Danh mục dây giày (độ dài) — dùng admin + trang chi tiết. */
export function isShoelaceCategoryHints(name, slug) {
  return inferAccessorySubKind(name, slug) === "shoelace";
}
