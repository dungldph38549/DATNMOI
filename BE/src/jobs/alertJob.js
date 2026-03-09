// ================================================================
// jobs/alertJob.js
// Gửi cảnh báo hàng sắp hết — email + (tuỳ chọn) Slack / Telegram
// ================================================================
const nodemailer = require("nodemailer"); // npm install nodemailer

// ── Mail transporter (cấu hình từ .env) ──────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Gửi email cảnh báo hàng sắp hết cho admin
 * @param {import("../models/Inventory").default} inventory
 */
const sendLowStockAlert = async (inventory) => {
  try {
    const productName = inventory.productId?.name || inventory.sku;
    const available = inventory.available;
    const status = inventory.status;

    const subject =
      status === "out_of_stock"
        ? `🚨 HẾT HÀNG: ${productName} (SKU: ${inventory.sku})`
        : `⚠️ Tồn kho thấp: ${productName} (SKU: ${inventory.sku})`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background: ${status === "out_of_stock" ? "#DC2626" : "#F59E0B"}; padding: 20px;">
          <h2 style="color: #fff; margin: 0;">
            ${status === "out_of_stock" ? "🚨 Hết hàng" : "⚠️ Tồn kho thấp"}
          </h2>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6B7280;">Sản phẩm</td><td><strong>${productName}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">SKU</td><td><code>${inventory.sku}</code></td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Tồn kho khả dụng</td><td><strong style="color: ${available === 0 ? "#DC2626" : "#F59E0B"};">${available}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Ngưỡng cảnh báo</td><td>${inventory.lowStockThreshold}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Trạng thái</td><td><span style="background: ${status === "out_of_stock" ? "#FEE2E2" : "#FEF3C7"}; color: ${status === "out_of_stock" ? "#DC2626" : "#92400E"}; padding: 2px 10px; border-radius: 999px; font-weight: 600;">${status}</span></td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Thời gian</td><td>${new Date().toLocaleString("vi-VN")}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${process.env.ADMIN_URL}/inventory/${inventory._id}" style="background: #1e293b; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Xem & Nhập kho →
            </a>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Hệ thống kho" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || "admin@example.com",
      subject,
      html,
    });

    console.log(`[AlertJob] Đã gửi cảnh báo: ${inventory.sku} — ${status}`);
  } catch (err) {
    console.error("[AlertJob] Lỗi gửi email:", err.message);
    // Không throw — alert thất bại không nên block luồng chính
  }
};

// ================================================================
// Cron job: Quét định kỳ tất cả hàng sắp hết mỗi 6 giờ
// Cài: npm install node-cron
// ================================================================
const scheduleLowStockScan = () => {
  try {
    const cron = require("node-cron");
    const Inventory = require("../models/Inventory");

    // Chạy lúc 8:00 và 20:00 mỗi ngày
    cron.schedule("0 8,20 * * *", async () => {
      console.log("[AlertJob] Đang quét hàng sắp hết...");
      try {
        const lowItems = await Inventory.getLowStock();
        const pending = lowItems.filter((i) => !i.alertSent);

        for (const inv of pending) {
          await sendLowStockAlert(inv);
          inv.alertSent = true;
          await inv.save();
        }

        console.log(`[AlertJob] Đã xử lý ${pending.length} cảnh báo.`);
      } catch (err) {
        console.error("[AlertJob] Lỗi quét:", err.message);
      }
    });

    console.log("[AlertJob] Đã đăng ký cron quét tồn kho.");
  } catch {
    console.warn("[AlertJob] node-cron chưa được cài — bỏ qua cron.");
  }
};

module.exports = { sendLowStockAlert, scheduleLowStockScan };
