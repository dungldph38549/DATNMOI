export const isProductOutOfStock = (product) => {
  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    const variantStocks = product.variants
      .map((variant) => toNumber(variant?.stock))
      .filter((n) => n !== null);

    if (variantStocks.length > 0) {
      return variantStocks.reduce((sum, n) => sum + n, 0) <= 0;
    }
  }

  const fallbackStock = toNumber(
    product?.countInStock ?? product?.stock ?? product?.totalStock ?? 0
  );
  return (fallbackStock ?? 0) <= 0;
};
