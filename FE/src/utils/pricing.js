export const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    const discountPercent =
      original > 0 ? Math.round(((original - effective) / original) * 100) : 0;
    return {
      originalPrice: original,
      effectivePrice: effective,
      hasSale: effective < original,
      discountPercent: Math.max(0, discountPercent),
    };
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
  const discountPercent =
    original > 0 ? Math.round(((original - effective) / original) * 100) : 0;
  return {
    originalPrice: original,
    effectivePrice: effective,
    hasSale: effective < original,
    discountPercent: Math.max(0, discountPercent),
  };
};
