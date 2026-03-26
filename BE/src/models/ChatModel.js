const mongoose = require("mongoose");

// Chat conversation is grouped by roomID = `customer:${customerId}`
// Multiple admins can join the same room (room is per customer).
const chatSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // receiverId can be null when sender is customer (admin receiver is not fixed).
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  senderRole: {
    type: String,
    enum: ["user", "admin", "ai"],
    required: true,
    index: true,
  },

  message: {
    type: String,
    required: true,
    trim: true,
  },

  timestamp: {
    type: Date,
    default: () => new Date(),
    index: true,
  },

  roomID: {
    type: String,
    required: true,
    index: true,
  },

  // Store customerId string for efficient inbox query
  customerId: {
    type: String,
    required: true,
    index: true,
  },
});

chatSchema.index({ roomID: 1, timestamp: 1 });

module.exports = mongoose.model("Chat", chatSchema);

