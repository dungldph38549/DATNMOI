const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Chat = require("../models/ChatModel");
const User = require("../models/UserModel");
const {
  AI_SENDER_OBJECT_ID,
  getAiReplyFromHistory,
} = require("../services/aiChatService");

const getJwtSecret = () =>
  process.env.ACCESS_TOKEN ||
  process.env.ACCESS_TOKEN_SECRET ||
  "access_secret";

const decodeSocketToken = async (token) => {
  const decoded = jwt.verify(token, getJwtSecret());
  const { payload } = decoded;

  // Trùng với authMiddleware: nếu payload có id -> query DB để lấy role/isActive mới nhất
  if (payload?.id) {
    const user = await User.findById(payload.id).select("-password");
    if (!user) throw new Error("USER_NOT_FOUND");

    const isBanned = user.isActive === false || user.isBanned === true;
    const systemRole = user.role;
    const normalizedRole =
      user.isAdmin === true || systemRole === "admin"
        ? "admin"
        : ["staff", "manager"].includes(systemRole)
          ? "staff"
          : "user";

    if (isBanned) throw new Error("USER_BANNED");

    return {
      id: user._id.toString(),
      role: normalizedRole,
      isAdmin: normalizedRole === "admin",
    };
  }

  // Token lightweight (hiếm) -> lấy payload trực tiếp
  const role = payload?.isAdmin
    ? "admin"
    : payload?.isStaff
      ? "staff"
      : "user";
  if (payload?.isBanned) throw new Error("USER_BANNED");

  return {
    id: payload?.id || payload?.userId || null,
    role,
    isAdmin: role === "admin",
  };
};

const roomForCustomer = (customerId) => `customer:${customerId}`;

const initChatSocket = (io) => {
  // Auth socket bằng token từ handshake
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next(new Error("UNAUTHORIZED"));

      const user = await decodeSocketToken(token);
      if (!user?.id) return next(new Error("UNAUTHORIZED"));

      socket.user = user;

      // Admin join inbox room để cập nhật realtime (không cần join từng customer)
      if (user.role === "admin") socket.join("admin:inbox");

      next();
    } catch (err) {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    // Join room theo customerId
    socket.on("chat:joinCustomerRoom", async ({ customerId }) => {
      try {
        const requester = socket.user;
        if (!requester?.id) return;

        const cid = String(customerId || "").trim();
        if (!cid) return;

        // user chỉ được join room của chính họ
        if (requester.role !== "admin" && requester.id !== cid) {
          return;
        }

        const roomID = roomForCustomer(cid);
        socket.join(roomID);

        socket.emit("chat:joinedRoom", { roomID });
      } catch {
        // ignore
      }
    });

    // Alias cho event "admin join room" (frontend có thể dùng)
    socket.on("chat:adminJoinRoom", ({ customerId }) => {
      const requester = socket.user;
      if (!requester || requester.role !== "admin") return;

      const cid = String(customerId || "").trim();
      if (!cid) return;

      const roomID = roomForCustomer(cid);
      socket.join(roomID);
    });

    socket.on("chat:sendMessage", async ({ customerId, message }) => {
      const requester = socket.user;
      if (!requester?.id) return;

      const cid = String(customerId || "").trim();
      const text = String(message || "").trim();
      if (!cid || !text) return;

      // user chỉ được gửi tin nhắn cho chính họ
      if (requester.role !== "admin" && requester.id !== cid) return;

      const roomID = roomForCustomer(cid);
      const senderRole = requester.role === "admin" ? "admin" : "user";

      // senderId lưu theo ObjectId => Mongoose sẽ cast từ string.
      // receiverId hiện không xác định chính xác admin nào (nhiều admin),
      // nên để null. UI dựa vào senderRole.
      const chatDoc = await Chat.create({
        senderId: requester.id,
        receiverId: null,
        senderRole,
        message: text,
        timestamp: new Date(),
        roomID,
        customerId: cid,
      });

      // Emit tới room customer để cả customer + các admin join room thấy realtime
      io.to(roomID).emit("chat:newMessage", {
        _id: chatDoc._id,
        message: chatDoc.message,
        senderId: chatDoc.senderId,
        senderRole: chatDoc.senderRole,
        timestamp: chatDoc.timestamp,
        roomID: chatDoc.roomID,
        customerId: chatDoc.customerId,
      });

      // Emit cập nhật inbox realtime tới tất cả admin
      if (senderRole) {
        io.to("admin:inbox").emit("chat:inbox:newMessage", {
          customerId: chatDoc.customerId,
          lastMessage: chatDoc.message,
          lastTimestamp: chatDoc.timestamp,
          senderRole: chatDoc.senderRole,
        });
      }

      // Khách nhắn → trợ lý AI tự trả lời (admin vẫn có thể nhắn tay như trước)
      if (senderRole === "user") {
        io.to(roomID).emit("chat:aiTyping", {
          customerId: cid,
          typing: true,
        });

        try {
          const recent = await Chat.find({ roomID })
            .sort({ timestamp: -1 })
            .limit(40)
            .select("senderRole message")
            .lean();
          recent.reverse();

          const { text: aiText } = await getAiReplyFromHistory(recent);

          const aiDoc = await Chat.create({
            senderId: AI_SENDER_OBJECT_ID,
            receiverId: null,
            senderRole: "ai",
            message: aiText,
            timestamp: new Date(),
            roomID,
            customerId: cid,
          });

          io.to(roomID).emit("chat:newMessage", {
            _id: aiDoc._id,
            message: aiDoc.message,
            senderId: aiDoc.senderId,
            senderRole: aiDoc.senderRole,
            timestamp: aiDoc.timestamp,
            roomID: aiDoc.roomID,
            customerId: aiDoc.customerId,
          });

          io.to("admin:inbox").emit("chat:inbox:newMessage", {
            customerId: aiDoc.customerId,
            lastMessage: aiDoc.message,
            lastTimestamp: aiDoc.timestamp,
            senderRole: aiDoc.senderRole,
          });
        } catch (e) {
          console.error("[chatSocket] AI reply failed", e);
          const fallback = await Chat.create({
            senderId: AI_SENDER_OBJECT_ID,
            receiverId: null,
            senderRole: "ai",
            message:
              "Đã xảy ra lỗi khi gọi trợ lý AI. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.",
            timestamp: new Date(),
            roomID,
            customerId: cid,
          });
          io.to(roomID).emit("chat:newMessage", {
            _id: fallback._id,
            message: fallback.message,
            senderId: fallback.senderId,
            senderRole: fallback.senderRole,
            timestamp: fallback.timestamp,
            roomID: fallback.roomID,
            customerId: fallback.customerId,
          });
        } finally {
          io.to(roomID).emit("chat:aiTyping", {
            customerId: cid,
            typing: false,
          });
        }
      }
    });

    socket.on("disconnect", () => {
      // ignore
    });
  });
};

module.exports = { initChatSocket };

