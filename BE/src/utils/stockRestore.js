const Product = require("../models/ProductModel");
const { findVariantBySku, incrementVariantStockAt } = require("./variantHelpers");

/**
 * Hoàn lại số lượng cho biến thể (theo SKU) sau khi hủy đơn / cleanup.
 */
const restoreVariantStockBySku = async (item, qty, session = null) => {
  const pid = item.productId?._id || item.productId;
  if (!pid) return;

  let q = Product.findById(pid);
  if (session) q = q.session(session);

  const productDoc = await q;
  if (!productDoc?.hasVariants) return;

  const variant = findVariantBySku(productDoc.variants, item.sku);
  if (!variant) return;

  await incrementVariantStockAt(pid, variant.sku, Number(qty || 0), session);
};

module.exports = { restoreVariantStockBySku };
