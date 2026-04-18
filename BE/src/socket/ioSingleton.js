/** Gắn từ index.js sau khi tạo Socket.IO Server — dùng gửi tin nhắn từ HTTP (vd: hủy đơn). */
let ioInstance = null;

exports.setSocketIO = (io) => {
  ioInstance = io || null;
};

exports.getSocketIO = () => ioInstance;
