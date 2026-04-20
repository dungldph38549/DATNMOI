const Chat = require("../models/ChatModel");
const User = require("../models/UserModel");

const getCustomerIdFromRoomID = (roomID) => {
  if (!roomID) return null;
  const prefix = "customer:";
  if (!String(roomID).startsWith(prefix)) return null;
  return String(roomID).slice(prefix.length);
};

const history = async (req, res) => {
  const requester = req.user;

  const customerId =
    requester?.isAdmin || requester?.role === "admin"
      ? req.query.customerId
      : requester?.id;

  if (!customerId) return res.status(400).json({ message: "Thiếu customerId", data: [] });

  const roomID = `customer:${customerId}`;

  const items = await Chat.find({ roomID })
    .sort({ timestamp: 1 })
    .limit(300)
    .lean();

  return res.status(200).json({ data: items });
};

const inbox = async (req, res) => {
  // Chỉ admin mới vào route này (router sẽ apply authAdminMiddleware)
  const items = await Chat.aggregate([
    { $match: { roomID: { $regex: "^customer:" } } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: "$customerId",
        last: { $first: "$$ROOT" },
      },
    },
    {
      $project: {
        customerId: "$_id",
        _id: 0,
        lastMessage: "$last.message",
        lastTimestamp: "$last.timestamp",
        senderRole: "$last.senderRole",
        senderId: "$last.senderId",
      },
    },
    { $sort: { lastTimestamp: -1 } },
  ]);

  const customerIds = items.map((i) => i.customerId).filter(Boolean);
  const customers = customerIds.length
    ? await User.find({ _id: { $in: customerIds } })
        .select("name email avatar")
        .lean()
    : [];

  const customerMap = customers.reduce((acc, u) => {
    acc[String(u._id)] = u;
    return acc;
  }, {});

  const data = items.map((i) => ({
    customerId: i.customerId,
    customer: customerMap[i.customerId] || null,
    lastMessage: i.lastMessage,
    lastTimestamp: i.lastTimestamp,
    senderRole: i.senderRole,
  }));

  return res.status(200).json({ data });
};

module.exports = {
  history,
  inbox,
};

