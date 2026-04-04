export const ORDER_STATUS_LABELS_VI = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  received: "Giao hàng thành công",
  canceled: "Đã hủy",
  "return-request": "Hoàn hàng: Đang yêu cầu",
  accepted: "Hoàn hàng: Đã chấp nhận",
  rejected: "Hoàn hàng: Bị từ chối",
  returned: "Hoàn hàng: Hoàn tất",
};

export const ORDER_STATUSES_SHOW_IN_REVIEW = new Set([
  "return-request",
  "accepted",
  "rejected",
  "returned",
  "canceled",
]);

export function getOrderStatusLabelForReview(status) {
  if (status == null || status === "") return null;
  const key = String(status).trim().toLowerCase();
  return ORDER_STATUS_LABELS_VI[key] ?? key;
}

export function shouldShowOrderStatusOnReview(status) {
  if (status == null || status === "") return false;
  return ORDER_STATUSES_SHOW_IN_REVIEW.has(String(status).trim().toLowerCase());
}
