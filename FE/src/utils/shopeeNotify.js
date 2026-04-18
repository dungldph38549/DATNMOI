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
