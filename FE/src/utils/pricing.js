export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildPriceInfo(originalRaw, effectiveRaw) {
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

  if (original <= 0) original = effective;

  const discountPercent =
    original > 0 ? Math.round(((original - effective) / original) * 100) : 0;

  return {
    originalPrice: original,
    effectivePrice: effective,
    hasSale: effective < original,
    discountPercent: Math.max(0, discountPercent),
  };
}

export function getProductPriceInfo(product, selectedVariant = null) {
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
      0
    );
    const effective = toNumber(
      selectedVariant.effectivePrice ??
        selectedVariant.salePrice ??
        selectedVariant.price ??
        0,
      0
    );
    return buildPriceInfo(original, effective);
  }

  const original = toNumber(
    product.originalPrice ??
      product.originalPriceRange?.min ??
      product.price ??
      product.priceRange?.min ??
      0,
    0
  );

  const effective = toNumber(
    product.effectivePrice ??
      product.salePrice ??
      product.priceRange?.min ??
      product.price ??
      0,
    0
  );

  return buildPriceInfo(original, effective);
}

export function getProductPriceRange(product) {
  if (!product) return { minPrice: 0, maxPrice: 0 };

  const pr = product?.priceRange;
  if (pr && (pr.min != null || pr.max != null)) {
    const min = toNumber(pr.min ?? pr.max ?? product?.price ?? 0, 0);
    const max = toNumber(pr.max ?? pr.min ?? product?.price ?? 0, 0);
    return { minPrice: Math.min(min, max), maxPrice: Math.max(min, max) };
  }

  const variantPrices = Array.isArray(product?.variants)
    ? product.variants
        .map((variant) =>
          toNumber(
            variant?.effectivePrice ?? variant?.salePrice ?? variant?.price,
            NaN
          )
        )
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];

  if (variantPrices.length > 0) {
    return {
      minPrice: Math.min(...variantPrices),
      maxPrice: Math.max(...variantPrices),
    };
  }

  const single = toNumber(
    product?.effectivePrice ?? product?.salePrice ?? product?.price,
    0
  );
  return { minPrice: single, maxPrice: single };
}