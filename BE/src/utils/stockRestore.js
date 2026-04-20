const Product = require("../models/ProductModel");

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

  const variant = productDoc.variants?.find((v) => v.sku === item.sku);
  if (!variant) return;

  variant.stock = Number(variant.stock || 0) + Number(qty || 0);

  if (session) await productDoc.save({ session });
  else await productDoc.save();
};

module.exports = { restoreVariantStockBySku };
