// ================================================================
// socket/inventorySocket.js
// Real-time tồn kho qua Socket.io
// Client lắng nghe: socket.on("stock:update", (data) => ...)
// ================================================================
let _io = null;

/**
 * Khởi tạo Socket.io — gọi trong server.js sau khi tạo httpServer
 * @param {import("socket.io").Server} io
 */
const initSocket = (io) => {
  _io = io;

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Client join room theo productId để nhận update của sản phẩm cụ thể
    socket.on("join:product", (productId) => {
      socket.join(`product:${productId}`);
      console.log(`[Socket] ${socket.id} joined product:${productId}`);
    });

    socket.on("leave:product", (productId) => {
      socket.leave(`product:${productId}`);
    });

    // Admin join room để nhận tất cả update
    socket.on("join:admin", () => {
      socket.join("admin:inventory");
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emit stock update sau mỗi thao tác nhập/xuất/reserve
 * @param {{ inventoryId, sku, productId?, available, status }} payload
 */
const emitStockUpdate = (payload) => {
  if (!_io) return;

  const data = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  // Broadcast đến room của sản phẩm (nếu có productId)
  if (payload.productId) {
    _io.to(`product:${payload.productId}`).emit("stock:update", data);
  }

  // Broadcast đến admin room (nhận tất cả)
  _io.to("admin:inventory").emit("stock:update", data);

  // Nếu out_of_stock → emit sự kiện riêng để FE xử lý UI
  if (payload.status === "out_of_stock") {
    _io.emit("stock:out", {
      sku: payload.sku,
      inventoryId: payload.inventoryId,
    });
  }

  // Nếu low_stock → emit cảnh báo
  if (payload.status === "low_stock") {
    _io.to("admin:inventory").emit("stock:low", data);
  }
};

/**
 * Emit khi đồng bộ xong từ hệ thống ngoài (ERP/WMS)
 */
const emitSyncDone = (summary) => {
  if (!_io) return;
  _io.to("admin:inventory").emit("stock:sync_done", {
    ...summary,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { initSocket, emitStockUpdate, emitSyncDone };

// ================================================================
// HƯỚNG DẪN TÍCH HỢP — server.js
// ================================================================
//
// const http           = require("http");
// const { Server }     = require("socket.io");
// const { initSocket } = require("./socket/inventorySocket");
//
// const app        = require("./app");
// const httpServer = http.createServer(app);
// const io         = new Server(httpServer, { cors: { origin: "*" } });
//
// initSocket(io);
//
// httpServer.listen(3000, () => console.log("Server running on :3000"));
//
// ================================================================
// CLIENT-SIDE (React) — ví dụ sử dụng
// ================================================================
//
// import { io } from "socket.io-client";
//
// const socket = io("http://localhost:3000");
//
// // Join room sản phẩm đang xem
// socket.emit("join:product", productId);
//
// // Lắng nghe cập nhật tồn kho real-time
// socket.on("stock:update", ({ sku, available, status }) => {
//   setStockStatus({ available, status });
//   if (status === "out_of_stock") showOutOfStockBanner();
// });
//
// socket.on("stock:out", ({ sku }) => {
//   console.warn("Hết hàng:", sku);
// });
