// index.js
require("dotenv").config();
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const productRouter = require("./src/routers/ProductRouter");
const brandRouter = require("./src/routers/BrandRouter");
const voucherRouter = require("./src/routers/VoucherRouter");
const categoryRouter = require("./src/routers/CategoryRouter");

const reviewRouter = require("./src/routers/ReviewRouter");
const adminReviewRouter = require("./src/routers/adminReviewRoutes");
const sizeRouter = require("./src/routers/SizeRouter");
const colorRouter = require("./src/routers/ColorRouter");
const inventoryRoutes = require("./routes/inventoryRoutes");
const { initSocket } = require("./socket/inventorySocket");
const { scheduleLowStockScan } = require("./jobs/alertJob");

dotenv.config(); // Đọc các biến từ file .env

const app = express();
app.use(express.json());

const port = process.env.PORT || 3001;
const mongoURI = process.env.MONGO_DB; // Lấy kết nối MongoDB từ file .env

if (!mongoURI) {
  console.error("MONGO_DB is not defined in .env");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("Hello API");
});

// Sử dụng các router cho các API
app.use("/api/product", productRouter);
app.use("/api/brand", brandRouter);
app.use("/api/voucher", voucherRouter);
app.use("/api/category", categoryRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/admin", adminReviewRouter);
app.use("/api/size", sizeRouter);
app.use("/api/color", colorRouter);
app.use("/api/inventory", inventoryRoutes);
// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Lỗi máy chủ";

  if (err.name === "ValidationError") {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message]),
    );
    return res
      .status(400)
      .json({ success: false, message: "Dữ liệu không hợp lệ", errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res
      .status(409)
      .json({ success: false, message: `${field} đã tồn tại` });
  }

  return res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ── Socket.io ─────────────────────────────────────────────────
initSocket(io);

// ── Cron Jobs ─────────────────────────────────────────────────
scheduleLowStockScan();

// Kết nối MongoDB và khởi động server
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("Connected to MongoDB");

    app.listen(port, () => {
      console.log("Server running at port", port);
    });
  })
  .catch((err) => {
    console.error("MongoDB error:", err.message);
  });
