const jwt = require("jsonwebtoken");
const Chat = require("../models/ChatModel");
const User = require("../models/UserModel");

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
        let customer = null;
        try {
          const u = await User.findById(cid).select("name email").lean();
          if (u) customer = { name: u.name, email: u.email };
        } catch {
          /* ignore */
        }
        io.to("admin:inbox").emit("chat:inbox:newMessage", {
          customerId: chatDoc.customerId,
          lastMessage: chatDoc.message,
          lastTimestamp: chatDoc.timestamp,
          senderRole: chatDoc.senderRole,
          customer,
        });
      }
    });

    socket.on("disconnect", () => {
      // ignore
    });
  });
};

module.exports = { initChatSocket };

