const isWithinWindow = (startAt, endAt, now = new Date()) => {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const calculateDiscount = (basePrice, discountType, discountValue) => {
  const base = Math.max(0, toNumber(basePrice, 0));
  const value = Math.max(0, toNumber(discountValue, 0));
  if (base <= 0 || value <= 0) return 0;
  const raw = discountType === "fixed" ? value : (base * value) / 100;
  return Math.max(0, Math.min(base, raw));
};

const normalizeSaleRules = (saleRules = []) =>
  (Array.isArray(saleRules) ? saleRules : [])
    .map((rule) => ({
      _id: rule?._id ?? null,
      name: rule?.name || "",
      scope: rule?.scope === "variant" ? "variant" : "product",
      variantSku: rule?.variantSku ? String(rule.variantSku).trim().toUpperCase() : null,
      discountType: rule?.discountType === "fixed" ? "fixed" : "percent",
      discountValue: Math.max(0, toNumber(rule?.discountValue, 0)),
      startAt: rule?.startAt || null,
      endAt: rule?.endAt || null,
      priority: toNumber(rule?.priority, 0),
      status: rule?.status === "inactive" ? "inactive" : "active",
    }))
    .filter((rule) => rule.discountValue > 0);

const pickBestActiveRule = ({ rules = [], sku = null, now = new Date() }) => {
  const normalizedSku = sku ? String(sku).trim().toUpperCase() : null;
  const activeRules = normalizeSaleRules(rules).filter((rule) => {
    if (rule.status !== "active") return false;
    if (!isWithinWindow(rule.startAt, rule.endAt, now)) return false;
    if (rule.scope === "variant") {
      if (!normalizedSku) return false;
      return rule.variantSku === normalizedSku;
    }
    return true;
  });

  if (!activeRules.length) return null;
  return activeRules.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return toNumber(new Date(b.startAt).getTime(), 0) - toNumber(new Date(a.startAt).getTime(), 0);
  })[0];
};

const calculateEffectivePrice = ({ basePrice, saleRule }) => {
  const base = Math.max(0, toNumber(basePrice, 0));
  if (!saleRule) {
    return {
      basePrice: base,
      effectivePrice: base,
      discountAmount: 0,
      discountPercent: 0,
      saleRule: null,
    };
  }

  const discountAmount = calculateDiscount(base, saleRule.discountType, saleRule.discountValue);
  const effectivePrice = Math.max(0, base - discountAmount);
  const discountPercent = base > 0 ? Math.round((discountAmount / base) * 100) : 0;

  return {
    basePrice: base,
    effectivePrice,
    discountAmount,
    discountPercent,
    saleRule,
  };
};

const enrichProductPricing = (rawProduct, now = new Date()) => {
  const product = rawProduct?.toObject ? rawProduct.toObject() : { ...(rawProduct || {}) };
  const saleRules = normalizeSaleRules(product.saleRules || []);

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    product.variants = product.variants.map((variant) => {
      const bestRule = pickBestActiveRule({
        rules: saleRules,
        sku: variant?.sku,
        now,
      });
      const pricing = calculateEffectivePrice({
        basePrice: variant?.price,
        saleRule: bestRule,
      });
      return {
        ...variant,
        originalPrice: pricing.basePrice,
        effectivePrice: pricing.effectivePrice,
        salePrice: pricing.effectivePrice,
        saleDiscountAmount: pricing.discountAmount,
        saleDiscountPercent: pricing.discountPercent,
        saleMeta: pricing.saleRule
          ? {
              id: pricing.saleRule._id,
              name: pricing.saleRule.name,
              scope: pricing.saleRule.scope,
              discountType: pricing.saleRule.discountType,
              discountValue: pricing.saleRule.discountValue,
              priority: pricing.saleRule.priority,
            }
          : null,
      };
    });

    const effectivePrices = product.variants
      .filter((v) => v?.isActive !== false)
      .map((v) => toNumber(v?.effectivePrice, 0))
      .filter((v) => Number.isFinite(v));
    const originalPrices = product.variants
      .filter((v) => v?.isActive !== false)
      .map((v) => toNumber(v?.originalPrice, 0))
      .filter((v) => Number.isFinite(v));
    if (effectivePrices.length > 0) {
      product.priceRange = {
        min: Math.min(...effectivePrices),
        max: Math.max(...effectivePrices),
      };
      product.originalPriceRange = {
        min: Math.min(...originalPrices),
        max: Math.max(...originalPrices),
      };
    }
    product.effectivePrice = product.priceRange?.min ?? toNumber(product.price, 0);
    product.originalPrice = product.originalPriceRange?.min ?? toNumber(product.price, 0);
    product.hasSale = product.variants.some((v) => toNumber(v?.saleDiscountAmount, 0) > 0);
    return product;
  }

  const bestRule = pickBestActiveRule({
    rules: saleRules,
    sku: null,
    now,
  });
  const pricing = calculateEffectivePrice({
    basePrice: product?.price,
    saleRule: bestRule,
  });
  product.originalPrice = pricing.basePrice;
  product.effectivePrice = pricing.effectivePrice;
  product.salePrice = pricing.effectivePrice;
  product.saleDiscountAmount = pricing.discountAmount;
  product.saleDiscountPercent = pricing.discountPercent;
  product.hasSale = pricing.discountAmount > 0;
  product.saleMeta = pricing.saleRule
    ? {
        id: pricing.saleRule._id,
        name: pricing.saleRule.name,
        scope: pricing.saleRule.scope,
        discountType: pricing.saleRule.discountType,
        discountValue: pricing.saleRule.discountValue,
        priority: pricing.saleRule.priority,
      }
    : null;
  product.priceRange = {
    min: pricing.effectivePrice,
    max: pricing.effectivePrice,
  };
  product.originalPriceRange = {
    min: pricing.basePrice,
    max: pricing.basePrice,
  };
  return product;
};

module.exports = {
  normalizeSaleRules,
  pickBestActiveRule,
  calculateEffectivePrice,
  enrichProductPricing,
};
