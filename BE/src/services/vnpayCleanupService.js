const Order = require("../models/OrderModel");
const Voucher = require("../models/VoucherModel");
const OrderStatusHistory = require("../models/orderStatusHistory");
const Product = require("../models/ProductModel");
const { restoreVariantStockBySku } = require("../utils/stockRestore");

const cleanupUnpaidVnpayOrders = async ({
  expireMinutes = Number(process.env.VNPAY_EXPIRE_MINUTES || 10),
  limit = Number(process.env.VNPAY_CLEANUP_LIMIT || 30),
} = {}) => {
  const cutoff = new Date(Date.now() - expireMinutes * 60 * 1000);

  const staleOrders = await Order.find({
    paymentMethod: "vnpay",
    paymentStatus: "unpaid",
    status: { $ne: "canceled" },
    createdAt: { $lte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  if (!staleOrders.length) return { scanned: 0, canceled: 0 };

  let canceled = 0;

  for (const order of staleOrders) {
    try {
      for (const item of order.products || []) {
        if (!item?.quantity) continue;

        if (item.sku) {
          try {
            await restoreVariantStockBySku(item, item.quantity);
          } catch {
            // Ignore restore errors to keep cleanup resilient.
          }
          continue;
        }

        try {
          const productDoc = await Product.findById(item.productId);
          if (productDoc && !productDoc.hasVariants) {
            productDoc.stock =
              Number(productDoc.stock || 0) + Number(item.quantity || 0);
            await productDoc.save();
          }
        } catch {
          // Ignore non-variant restore errors to keep cleanup resilient.
        }
      }

      if (order.voucherCode) {
        await Voucher.findOneAndUpdate(
          { code: String(order.voucherCode).trim().toUpperCase() },
          { $inc: { usedCount: -1 } },
        );
      }

      await Order.findByIdAndUpdate(order._id, {
        status: "canceled",
        voucherCode: null,
        discount: 0,
      });

      await OrderStatusHistory.create({
        oldStatus: order.status,
        newStatus: "canceled",
        orderId: order._id,
        note: "Hủy tự động do quá hạn thanh toán VNPay",
      });

      canceled += 1;
    } catch (err) {
      // Ignore single-order failure and continue with others.
      console.error("[VNPayCleanup] Failed to cancel order:", order?._id, err?.message);
    }
  }

  return { scanned: staleOrders.length, canceled };
};

module.exports = { cleanupUnpaidVnpayOrders };

