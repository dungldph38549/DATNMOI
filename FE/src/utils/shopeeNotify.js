import Swal from "sweetalert2";

let toastTimer = null;
let toastEl = null;

function removeToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (toastEl?.parentNode) {
    toastEl.parentNode.removeChild(toastEl);
  }
  toastEl = null;
}

/**
 * Toast kiểu Shopee: nền mờ, hộp tối giữa màn hình, icon tròn, chữ trắng.
 */
export function showShopeeToast(text, type = "success", durationMs = 2500) {
  removeToast();

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:100000",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:24px",
    "background:rgba(0,0,0,0.45)",
    "box-sizing:border-box",
  ].join(";");

  const box = document.createElement("div");
  box.style.cssText = [
    "background:rgba(0,0,0,0.82)",
    "padding:28px 32px",
    "border-radius:14px",
    "max-width:min(340px,calc(100vw - 48px))",
    "text-align:center",
    "box-shadow:0 12px 40px rgba(0,0,0,0.35)",
    "pointer-events:auto",
  ].join(";");

  const iconColor =
    type === "success"
      ? "#00b14f"
      : type === "error"
        ? "#ff424f"
        : type === "warning"
          ? "#ff9800"
          : "#1677ff";

  const iconWrap = document.createElement("div");
  iconWrap.style.cssText = [
    "width:58px",
    "height:58px",
    "margin:0 auto 18px",
    "border-radius:50%",
    `background:${iconColor}`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "flex-shrink:0",
  ].join(";");

  if (type === "success") {
    iconWrap.innerHTML =
      '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  } else if (type === "error") {
    iconWrap.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>';
  } else {
    iconWrap.innerHTML =
      '<span style="color:white;font-size:26px;font-weight:700;line-height:1">!</span>';
  }

  const msg = document.createElement("div");
  msg.textContent = String(text || "");
  msg.style.cssText = [
    "color:#fff",
    "font-size:16px",
    "font-weight:500",
    "line-height:1.5",
    "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  ].join(";");

  box.appendChild(iconWrap);
  box.appendChild(msg);
  overlay.appendChild(box);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) removeToast();
  });

  document.body.appendChild(overlay);
  toastEl = overlay;

  toastTimer = setTimeout(removeToast, Math.max(1200, durationMs));
}

const toMs = (duration) => {
  if (duration == null || Number.isNaN(Number(duration))) return 2500;
  return Math.max(1200, Number(duration) * 1000);
};

export const shopeeToast = {
  success: (content, duration) =>
    showShopeeToast(String(content || ""), "success", toMs(duration)),
  error: (content, duration) =>
    showShopeeToast(String(content || ""), "error", toMs(duration)),
  warning: (content, duration) =>
    showShopeeToast(String(content || ""), "warning", toMs(duration)),
  info: (content, duration) =>
    showShopeeToast(String(content || ""), "info", toMs(duration)),
};

/**
 * Xác nhận thay cho window.confirm — nút cam Shopee / xám hủy.
 */
export function confirmShopee({
  text,
  title = "",
  confirmText = "Đồng ý",
  cancelText = "Hủy",
}) {
  return Swal.fire({
    title: title || undefined,
    text: text || "",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: "#ee4d2d",
    cancelButtonColor: "#e8e8e8",
    color: "#222",
    background: "#fff",
    borderRadius: 12,
  }).then((r) => r.isConfirmed);
}

const DEFAULT_CANCEL_REASONS = [
  "Tôi muốn cập nhật địa chỉ/sđt nhận hàng.",
  "Tôi muốn thêm/thay đổi Mã giảm giá",
  "Tôi muốn thay đổi sản phẩm (kích thước, màu sắc, số lượng...)",
  "Thủ tục thanh toán rắc rối",
  "Tôi tìm thấy chỗ mua khác tốt hơn (Rẻ hơn, uy tín hơn, giao nhanh hơn...)",
  "Tôi không có nhu cầu mua nữa",
  "Tôi không tìm thấy lý do hủy phù hợp",
];

/** Lý do hủy dành cho admin/cửa hàng — tách biệt bộ lý do phía khách ở trên. */
export const ADMIN_CANCEL_REASONS = [
  "Hết hàng / không đủ tồn kho để giao.",
  "Sai thông tin sản phẩm, giá hoặc khuyến mãi trên hệ thống Shop.",
  "Khách liên hệ yêu cầu hủy (đã xác minh với CSKH).",
  "Đơn trùng hoặc dấu hiệu gian lận.",
  "Không liên lạc được khách để xác nhận giao hàng.",
  "Khu vực giao hàng không khả thi hoặc lỗi vận chuyển.",
];

/**
 * Chọn lý do hủy cho thao tác admin (đơn / dòng).
 * Dùng cùng UI với khách nhưng danh sách preset khác hoàn toàn.
 */
export function pickAdminCancelReason({
  title = "Lý do hủy (cửa hàng)",
  reasons = ADMIN_CANCEL_REASONS,
  confirmText = "Xác nhận",
  cancelText = "Đóng",
} = {}) {
  return pickCancelReasonShopee({
    title,
    reasons,
    confirmText,
    cancelText,
  });
}

export function pickCancelReasonShopee({
  title = "Lý Do Hủy",
  reasons = DEFAULT_CANCEL_REASONS,
  confirmText = "Xác nhận",
  cancelText = "Đóng",
} = {}) {
  const baseOptions = (Array.isArray(reasons) ? reasons : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .map((label) => ({ label, custom: false }));
  const options = [
    ...baseOptions,
    { label: "Khác (vui lòng nhập lý do)", custom: true },
  ];
  if (!options.length) return Promise.resolve(null);

  const html = `
    <style>
      .cancel-reason-radio {
        -webkit-appearance: none;
        appearance: none;
        width: 22px;
        height: 22px;
        min-width: 22px;
        min-height: 22px;
        max-width: 22px;
        max-height: 22px;
        margin: 0;
        border: 2px solid #b9b9b9;
        border-radius: 9999px;
        background: #fff;
        box-sizing: border-box;
        display: inline-grid;
        place-content: center;
        flex: 0 0 22px;
        cursor: pointer;
      }
      .cancel-reason-radio::before {
        content: "";
        width: 10px;
        height: 10px;
        border-radius: 9999px;
        transform: scale(0);
        transition: transform 120ms ease-in-out;
        background: #ee4d2d;
      }
      .cancel-reason-radio:checked {
        border-color: #ee4d2d;
      }
      .cancel-reason-radio:checked::before {
        transform: scale(1);
      }
      .cancel-reason-close-btn {
        color: #9a9a9a !important;
        font-size: 34px !important;
        line-height: 1 !important;
        right: 14px !important;
        top: 10px !important;
      }
      .cancel-reason-close-btn:hover {
        color: #666 !important;
      }
    </style>
    <div class="cancel-reason-list" style="text-align:left;max-height:52vh;overflow:auto;">
      ${options
        .map(
          (reason, idx) => `
            <label style="display:flex;gap:12px;align-items:center;min-height:68px;padding:10px 0;border-bottom:1px solid #f1f1f1;cursor:pointer;box-sizing:border-box;">
              <input type="radio" class="cancel-reason-radio" name="cancel_reason" value="${String(idx)}" />
              <span style="font-size:18px;line-height:1.35;color:#222;">${reason.label}</span>
            </label>
          `,
        )
        .join("")}
      <div id="cancel-reason-custom-wrap" style="display:none;padding:12px 0 6px;">
        <textarea
          id="cancel-reason-custom-input"
          rows="3"
          maxlength="500"
          placeholder="Vui lòng nhập lý do khác..."
          style="width:100%;border:1px solid #d9d9d9;border-radius:8px;padding:10px 12px;font-size:16px;line-height:1.4;resize:vertical;box-sizing:border-box;outline:none;"
        ></textarea>
        <div style="margin-top:6px;font-size:12px;color:#888;">Tối thiểu 5 ký tự</div>
      </div>
    </div>
  `;

  return Swal.fire({
    title,
    html,
    showCancelButton: false,
    showCloseButton: true,
    closeButtonHtml: "&times;",
    confirmButtonText: confirmText,
    reverseButtons: false,
    focusConfirm: false,
    confirmButtonColor: "#ee4d2d",
    color: "#222",
    background: "#fff",
    borderRadius: 12,
    customClass: {
      closeButton: "cancel-reason-close-btn",
    },
    didOpen: () => {
      const popup = Swal.getPopup();
      const confirmBtn = Swal.getConfirmButton();
      if (!popup || !confirmBtn) return;
      confirmBtn.disabled = true;
      const radios = popup.querySelectorAll('input[name="cancel_reason"]');
      const customWrap = popup.querySelector("#cancel-reason-custom-wrap");
      const customInput = popup.querySelector("#cancel-reason-custom-input");
      const syncCustomVisibility = () => {
        const checked = popup.querySelector('input[name="cancel_reason"]:checked');
        const idx = Number(checked?.value);
        const isCustom =
          Number.isInteger(idx) && idx >= 0 && idx < options.length
            ? !!options[idx].custom
            : false;
        if (customWrap) customWrap.style.display = isCustom ? "block" : "none";
        if (!isCustom && customInput) customInput.value = "";
      };
      radios.forEach((el) =>
        el.addEventListener("change", () => {
          confirmBtn.disabled = false;
          syncCustomVisibility();
        }),
      );
      if (customInput) {
        customInput.addEventListener("input", () => {
          customInput.style.borderColor = "#d9d9d9";
        });
      }
    },
    preConfirm: () => {
      const popup = Swal.getPopup();
      const checked = popup?.querySelector(
        'input[name="cancel_reason"]:checked',
      );
      if (!checked) {
        Swal.showValidationMessage("Vui lòng chọn lý do hủy.");
        return null;
      }
      const idx = Number(checked.value);
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
        Swal.showValidationMessage("Lý do hủy không hợp lệ.");
        return null;
      }
      if (options[idx].custom) {
        const customInput = popup?.querySelector("#cancel-reason-custom-input");
        const customReason = String(customInput?.value || "").trim();
        if (customReason.length < 5) {
          if (customInput) customInput.style.borderColor = "#ff4d4f";
          Swal.showValidationMessage("Vui lòng nhập lý do khác (tối thiểu 5 ký tự).");
          return null;
        }
        return customReason;
      }
      return options[idx].label;
    },
  }).then((r) => (r.isConfirmed ? r.value : null));
}
