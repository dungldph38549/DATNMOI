/** Dòng hàng còn hiệu lực (chưa hủy riêng lẻ). */
function isLineActive(item) {
  return item && String(item.lineStatus || "active") !== "canceled";
}

function sumActiveSubtotal(products) {
  return (products || []).filter(isLineActive).reduce(
    (s, p) => s + Number(p.price || 0) * Number(p.quantity || 0),
    0,
  );
}

module.exports = { isLineActive, sumActiveSubtotal };
