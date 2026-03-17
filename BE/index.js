require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");

// 1. Import Routes và Cấu hình hệ thống
const routes = require("./src/routers");
const { initSocket } = require("./src/socket/inventorySocket");
const { scheduleLowStockScan } = require("./src/jobs/alertJob");

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

// 8. Khởi chạy Socket & Jobs
initSocket(io);
scheduleLowStockScan();

// 9. Kết nối MongoDB và Start Server
const startServer = async () => {
  try {
    const mongoURI = process.env.MONGO_DB;
    if (!mongoURI) throw new Error("MONGO_DB is not defined in .env");

    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB successfully!");

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
