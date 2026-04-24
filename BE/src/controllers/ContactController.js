const mongoose = require("mongoose");
const Contact = require("../models/ContactModel");

const normalizeText = (value = "") => String(value || "").trim();

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

    return res.status(201).json({
      status: "OK",
      message: "Đã gửi liên hệ thành công.",
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
