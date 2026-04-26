const Chat = require("../models/ChatModel");
const User = require("../models/UserModel");
const { getSocketIO } = require("../socket/ioSingleton");

const roomForCustomer = (customerId) => `customer:${customerId}`;

/**
 * Gửi tin nhắn chat tới khách (phòng customer:userId) khi admin hủy đơn.
 * Khách không đăng nhập (guest, không userId) thì bỏ qua.
 */
async function notifyCustomerOfAdminOrderCancel({ order, note }) {
  const rawUid = order?.userId?._id || order?.userId;
  if (!rawUid) return;

  const text = String(note || "").trim();
  if (!text) return;

  const cid = String(rawUid);
  const admin = await User.findOne({
    $or: [{ isAdmin: true }, { role: "admin" }],
  })
    .select("_id")
    .lean();

  if (!admin?._id) return;

  const shortId = String(order._id).slice(-8).toUpperCase();
  const message = `[Thông báo đơn hàng] Đơn #${shortId} đã bị hủy bởi cửa hàng.\nLý do: ${text}`;

  const chatDoc = await Chat.create({
    senderId: admin._id,
    receiverId: null,
    senderRole: "admin",
    message,
    timestamp: new Date(),
    roomID: roomForCustomer(cid),
    customerId: cid,
  });

  const io = getSocketIO();
  if (!io) return;

  const payload = {
    _id: chatDoc._id,
    message: chatDoc.message,
    senderId: chatDoc.senderId,
    senderRole: chatDoc.senderRole,
    timestamp: chatDoc.timestamp,
    roomID: chatDoc.roomID,
    customerId: chatDoc.customerId,
  };
  io.to(roomForCustomer(cid)).emit("chat:newMessage", payload);
  /** Toast / banner phía khách (socket kết nối toàn app, không cần mở Chat). */
  io.to(roomForCustomer(cid)).emit("customer:notify", {
    kind: "order_canceled_by_shop",
    title: "Đơn hàng đã bị hủy",
    body: `Đơn #${shortId} đã bị hủy bởi cửa hàng. Lý do: ${text}`,
    orderId: String(order._id),
    shortId,
  });
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

module.exports = { notifyCustomerOfAdminOrderCancel };
