export const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Đồng bộ với BE `salePricing.js` — giá niêm yết ảo khi không có giảm giá thật (% trên giá bán). */
const VIRTUAL_LIST_PRICE_MARKUP_PERCENT = 15;

const buildPriceInfo = (originalRaw, effectiveRaw) => {
  let original = toNumber(originalRaw, 0);
  const effective = toNumber(effectiveRaw, 0);

  if (effective <= 0) {
    return {
      originalPrice: original,
      effectivePrice: effective,
      hasSale: false,
      discountPercent: 0,
    };
  }

  if (original <= effective) {
    const factor = 1 + VIRTUAL_LIST_PRICE_MARKUP_PERCENT / 100;
    original = Math.round(effective * factor);
  }

  const discountPercent =
    original > 0 ? Math.round(((original - effective) / original) * 100) : 0;

  return {
    originalPrice: original,
    effectivePrice: effective,
    hasSale: effective < original,
    discountPercent: Math.max(0, discountPercent),
  };
};

export const getProductPriceInfo = (product, selectedVariant = null) => {
  if (!product) {
    return {
      originalPrice: 0,
      effectivePrice: 0,
      hasSale: false,
      discountPercent: 0,
    };
  }

  if (selectedVariant) {
    const original = toNumber(
      selectedVariant.originalPrice ?? selectedVariant.price ?? 0,
      0,
    );
    const effective = toNumber(
      selectedVariant.effectivePrice ?? selectedVariant.salePrice ?? selectedVariant.price ?? 0,
      0,
    );
    return buildPriceInfo(original, effective);
  }

  const original = toNumber(
    product.originalPrice ??
      product.originalPriceRange?.min ??
      product.price ??
      product.priceRange?.min ??
      0,
    0,
  );
  const effective = toNumber(
    product.effectivePrice ?? product.salePrice ?? product.priceRange?.min ?? product.price ?? 0,
    0,
  );

  return buildPriceInfo(original, effective);
};