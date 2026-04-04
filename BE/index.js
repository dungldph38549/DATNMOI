const path = require("path");
// Luôn đọc .env cạnh index.js (tránh lỗi khi chạy node từ thư mục khác trên Windows)
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");

// 1. Import Routes và Cấu hình hệ thống
const routes = require("./src/routers");
const { syncReviewIndexes } = require("./src/migrations/syncReviewIndexes");
const {
  syncWalletTransactionIndexes,
} = require("./src/migrations/syncWalletTransactionIndexes");
const { initChatSocket } = require("./src/socket/chatSocket");
const { cleanupUnpaidVnpayOrders } = require("./src/services/vnpayCleanupService");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// 2. Cấu hình Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  },
});

// 3. Middlewares
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Cấu hình Static folder & Multer (Upload ảnh)
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});
const upload = multer({ storage });

// 5. Routes trực tiếp (Upload & Test)
app.get("/", (req, res) => {
  res.send("--- HELLO! BACKEND SNEAKERHOUSE CHẠY THÀNH CÔNG ---");
});

// Health check cho FE / công cụ kiểm tra API
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "API đang chạy",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Không có file" });
  res
    .status(200)
    .json({
      success: true,
      message: "Tải lên thành công",
      path: req.file.filename,
    });
});

app.post("/api/uploads/multiple", upload.array("files", 10), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "Không có ảnh" });
  const filePaths = req.files.map((file) => file.filename);
  res.status(200).json({ success: true, paths: filePaths });
});

// 6. Sử dụng Routes tập trung (Consolidated Routes)
// Hàm routes(app) này sẽ tự động gọi tất cả: productRouter, userRouter, cartRouter...
routes(app);

// 7. Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Lỗi máy chủ nội bộ";

  // Log stack để truy lỗi "next is not a function" chính xác.
  // (Chỉ log ra console, không ảnh hưởng API client)
  console.error("[GlobalError]", message);
  if (err?.stack) console.error(err.stack);

  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ success: false, message: "Lỗi tải file: " + err.message });
  }

  res.status(status).json({
    success: false,
    message,
    // Debug nhanh cho lỗi hay gặp (không cần bật NODE_ENV=development)
    ...(err?.message?.includes("next is not a function") && { stack: err.stack }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 8. Khởi chạy Socket & Jobs
initChatSocket(io);
setInterval(async () => {
  try {
    const result = await cleanupUnpaidVnpayOrders();
    if (result?.canceled > 0) {
      console.log(
        `[VNPayCleanup] Auto-canceled ${result.canceled}/${result.scanned} unpaid orders`,
      );
    }
  } catch (err) {
    console.error("[VNPayCleanup] Job error:", err?.message);
  }
}, Number(process.env.VNPAY_CLEANUP_INTERVAL_MS || 60 * 1000));

// 9. Kết nối MongoDB và Start Server
const startServer = async () => {
  try {
    if (!process.env.ACCESS_TOKEN && !process.env.ACCESS_TOKEN_SECRET) {
      console.warn("⚠️ ACCESS_TOKEN chưa có trong .env — các route cần đăng nhập sẽ lỗi.");
    }

    const connectionCandidates = [
      process.env.MONGO_DB,
      process.env.MONGO_URL,
      process.env.MONGO_LOCAL,
      "mongodb://127.0.0.1:27017/DATN1",
    ].filter(Boolean);

    if (connectionCandidates.length === 0) {
      throw new Error(
        "Mongo URI is not defined. Hãy thêm MONGO_DB hoặc MONGO_URL trong .env",
      );
    }

    let connected = false;
    let lastError = null;
    const mongoConnectOptions = {
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 30000,
      ),
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 30000),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
      family: 4,
    };

    for (const uri of connectionCandidates) {
      try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(uri, mongoConnectOptions);
        connected = true;
        console.log("✅ Connected to MongoDB successfully!");
        try {
          await syncReviewIndexes();
        } catch (idxErr) {
          console.error(
            "[reviews] Lỗi đồng bộ index (có thể cần xóa tay productId_1_userId_1 trong MongoDB):",
            idxErr?.message || idxErr,
          );
        }
        try {
          await syncWalletTransactionIndexes();
        } catch (idxErr) {
          console.error(
            "[wallettransactions] Lỗi đồng bộ index:",
            idxErr?.message || idxErr,
          );
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ Kết nối DB thất bại với URI: ${uri}`);
        console.warn(`   ↳ Lý do: ${err.message}`);
      }
    }

    if (!connected) {
      throw lastError || new Error("Không thể kết nối MongoDB");
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};


startServer();