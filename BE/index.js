require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");

// Import Route tổng hợp và Socket/Jobs
const routes = require("./src/routers");
const { initSocket } = require("./src/socket/inventorySocket");
const { scheduleLowStockScan } = require("./src/jobs/alertJob");

const app = express();
const server = http.createServer(app);

// ==========================================
// 1. CẤU HÌNH SOCKET.IO
// ==========================================
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

// ==========================================
// 2. MIDDLEWARES & STATIC FILES
// ==========================================
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
// Cho phép truy cập thư mục public
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Cấu hình thư mục lưu trữ ảnh công khai
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// ==========================================
// 3. CẤU HÌNH MULTER (UPLOAD FILE)
// ==========================================
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

// ==========================================
// 4. ROUTES TRỰC TIẾP (CHO UPLOAD)
// ==========================================
// API Upload 1 ảnh
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Không có file" });
  res.status(200).json({
    success: true,
    message: "Tải lên thành công",
    path: req.file.filename,
  });
});

// API Upload nhiều ảnh
app.post("/api/uploads/multiple", upload.array("files", 10), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "Không có ảnh" });
  const filePaths = req.files.map((file) => file.filename);
  res.status(200).json({ success: true, paths: filePaths });
});

// Gọi các route nghiệp vụ khác từ src/routers/index.js
routes(app);

// ==========================================
// 5. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Lỗi máy chủ";

  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ success: false, message: "Lỗi tải file: " + err.message });
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ==========================================
// 6. KHỞI CHẠY HỆ THỐNG
// ==========================================
initSocket(io);
scheduleLowStockScan();

const MONGO_URI = process.env.MONGO_DB;
const PORT = process.env.PORT || 3001;

if (!MONGO_URI) {
  console.error("❌ MONGO_DB chưa được định nghĩa trong file .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`🚀 Server running on: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect MongoDB:", err);
    process.exit(1);
  });
