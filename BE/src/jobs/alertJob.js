// Đồng bộ API: giữ export scheduleLowStockScan (no-op) để index không phải đổi nếu sau này thêm cảnh báo khác.
const scheduleLowStockScan = () => {};

module.exports = { scheduleLowStockScan };
