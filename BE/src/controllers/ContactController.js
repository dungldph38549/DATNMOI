const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Contact = require("../models/ContactModel");

const normalizeText = (value = "") => String(value || "").trim();
const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const parseBoolean = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const REQUIRED_SMTP_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];

const createContactMailer = () => {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST || "";
  const user =
    process.env.SMTP_USER ||
    process.env.MAIL_USER ||
    process.env.EMAIL_USER ||
    "";
  const pass =
    process.env.SMTP_PASS ||
    process.env.MAIL_PASS ||
    process.env.EMAIL_PASS ||
    "";
  const port = Number(
    process.env.SMTP_PORT || process.env.MAIL_PORT || process.env.EMAIL_PORT || 0,
  );
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);

  if (!host || !user || !pass || !port) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const sendContactAutoReply = async ({ toEmail, name, subject, message }) => {
  const transporter = createContactMailer();
  if (!transporter) {
    return {
      sent: false,
      reason: `Thiếu cấu hình SMTP. Cần ${REQUIRED_SMTP_KEYS.join(", ")}`,
    };
  }

  const fromEmail =
    process.env.CONTACT_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.MAIL_USER ||
    process.env.EMAIL_USER;

  if (!fromEmail) {
    return {
      sent: false,
      reason: "Thiếu email gửi đi (CONTACT_FROM_EMAIL hoặc SMTP_USER).",
    };
  }

  const safeName = normalizeText(name) || "bạn";
  const safeSubject = normalizeText(subject) || "Liên hệ từ khách hàng";
  const safeMessage = normalizeText(message);
  const htmlName = escapeHtml(safeName);
  const htmlSubject = escapeHtml(safeSubject);
  const htmlMessage = escapeHtml(safeMessage);

  await transporter.sendMail({
    from: `SneakerConverse <${fromEmail}>`,
    to: toEmail,
    subject: "SneakerConverse đã nhận được liên hệ của bạn",
    text:
      `Xin chào ${safeName},\n\n` +
      "SneakerConverse đã nhận được liên hệ của bạn với nội dung:\n" +
      `- Tiêu đề: ${safeSubject}\n` +
      `- Nội dung: ${safeMessage}\n\n` +
      "Đội ngũ hỗ trợ sẽ phản hồi sớm nhất trong giờ làm việc.\n\n" +
      "Trân trọng,\nSneakerConverse",
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
        <p>Xin chào <b>${htmlName}</b>,</p>
        <p>SneakerConverse đã nhận được liên hệ của bạn với nội dung:</p>
        <ul>
          <li><b>Tiêu đề:</b> ${htmlSubject}</li>
          <li><b>Nội dung:</b> ${htmlMessage}</li>
        </ul>
        <p>Đội ngũ hỗ trợ sẽ phản hồi sớm nhất trong giờ làm việc.</p>
        <p>Trân trọng,<br/>SneakerConverse</p>
      </div>
    `,
  });

  return { sent: true, reason: "" };
};

const createContact = async (req, res) => {
  try {
    const name = normalizeText(req.body?.name);
    const email = normalizeText(req.body?.email).toLowerCase();
    const phone = normalizeText(req.body?.phone);
    const subject = normalizeText(req.body?.subject);
    const message = normalizeText(req.body?.message);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: "ERR",
        message: "Vui lòng nhập đầy đủ họ tên, email, tiêu đề và nội dung.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        status: "ERR",
        message: "Email không hợp lệ.",
      });
    }

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";
    const userAgent = normalizeText(req.headers["user-agent"]);

    const created = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
      userId: req.user?.id || null,
      ipAddress,
      userAgent,
    });

    let autoReplySent = false;
    let autoReplyReason = "";
    try {
      const autoReply = await sendContactAutoReply({
        toEmail: email,
        name,
        subject,
        message,
      });
      autoReplySent = Boolean(autoReply?.sent);
      autoReplyReason = String(autoReply?.reason || "");
    } catch (mailError) {
      // Không làm fail tạo liên hệ nếu SMTP gặp sự cố.
      console.error("[ContactController] send auto reply failed:", mailError?.message);
      autoReplyReason = mailError?.message || "Gửi email thất bại.";
    }

    return res.status(201).json({
      status: "OK",
      message: "Đã gửi liên hệ thành công.",
      autoReplySent,
      autoReplyReason,
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERR",
      message: error?.message || "Không thể gửi liên hệ lúc này.",
    });
  }
};

const listContactsForAdmin = async (req, res) => {
  try {
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 100);
    const status = normalizeText(req.query?.status);
    const keyword = normalizeText(req.query?.keyword);

    const query = {};
    if (status && status !== "all") query.status = status;
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { subject: { $regex: keyword, $options: "i" } },
        { message: { $regex: keyword, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Contact.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Contact.countDocuments(query),
    ]);

    return res.status(200).json({
      status: "OK",
      data: {
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERR",
      message: error?.message || "Không thể tải danh sách liên hệ.",
    });
  }
};

const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const status = normalizeText(req.body?.status);
    const adminNote = normalizeText(req.body?.adminNote);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "ERR", message: "ID liên hệ không hợp lệ." });
    }

    const allowedStatus = ["new", "in_progress", "resolved", "archived"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ status: "ERR", message: "Trạng thái không hợp lệ." });
    }

    const payload = {
      status,
      adminNote,
    };
    payload.resolvedAt = status === "resolved" ? new Date() : null;

    const updated = await Contact.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) {
      return res.status(404).json({ status: "ERR", message: "Không tìm thấy liên hệ." });
    }

    return res.status(200).json({
      status: "OK",
      message: "Cập nhật trạng thái liên hệ thành công.",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERR",
      message: error?.message || "Không thể cập nhật liên hệ.",
    });
  }
};

const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "ERR", message: "ID liên hệ không hợp lệ." });
    }

    const deleted = await Contact.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: "ERR", message: "Không tìm thấy liên hệ." });
    }

    return res.status(200).json({
      status: "OK",
      message: "Đã xóa liên hệ.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERR",
      message: error?.message || "Không thể xóa liên hệ.",
    });
  }
};

module.exports = {
  createContact,
  listContactsForAdmin,
  updateContactStatus,
  deleteContact,
};
