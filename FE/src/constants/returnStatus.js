export const RETURN_STATUS = {
  PENDING: "return-pending",
  APPROVED: "return-approved",
  REJECTED: "return-rejected",
  SHIPPED: "return-shipped",
  RECEIVED: "return-received",
  REFUNDED: "return-refunded",
};

export const RETURN_STATUS_LABELS = {
  [RETURN_STATUS.PENDING]: "Chờ xử lý",
  [RETURN_STATUS.APPROVED]: "Đã chấp nhận",
  [RETURN_STATUS.REJECTED]: "Từ chối hoàn hàng",
  [RETURN_STATUS.SHIPPED]: "Đã gửi hàng hoàn",
  [RETURN_STATUS.RECEIVED]: "Đã nhận hàng hoàn",
  [RETURN_STATUS.REFUNDED]: "Đã hoàn tiền",
};

export const RETURN_REASONS = [
  { value: "defective", label: "Sản phẩm bị lỗi/hỏng" },
  { value: "wrong-item", label: "Giao sai sản phẩm" },
  { value: "not-as-described", label: "Không đúng mô tả" },
  { value: "quality-issue", label: "Chất lượng không tốt" },
  { value: "changed-mind", label: "Đổi ý không muốn mua" },
  { value: "size-issue", label: "Không vừa kích thước" },
  { value: "other", label: "Lý do khác" },
];
