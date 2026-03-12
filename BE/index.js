require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const routes = require("./src/routers");
const app = express();
const port = process.env.PORT || 3001;
// Middlewares
app.use(cors());
app.use(express.json());

// Main route

const path = require("path");

const productRouter = require("./src/routers/ProductRouter");
const brandRouter = require("./src/routers/BrandRouter");
const voucherRouter = require("./src/routers/VoucherRouter");
const categoryRouter = require("./src/routers/CategoryRouter");
const userRouter = require("./src/routers/UserRouter");
const reviewRouter = require("./src/routers/ReviewRouter");
const adminReviewRouter = require("./src/routers/adminReviewRoutes");
const sizeRouter = require("./src/routers/SizeRouter");
const colorRouter = require("./src/routers/ColorRouter");
const cartRouter = require("./src/routers/CartRouter");
const orderRouter = require("./src/routers/OrderRouter");

const app = express();

const port = process.env.PORT || 3001;
const mongoURI = process.env.MONGO_DB;

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

// Static folder cho ảnh
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test API

app.get("/", (req, res) => {
  res.send("--- HELLO! BACKEND CHAY THANH CONG TRENT PORT 3001 ---");
});


// Use consolidated routes
routes(app);

// Startup sequence
const startServer = async () => {
  try {
    const mongoURI = process.env.MONGO_DB;
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!mongoURI) throw new Error("MONGO_DB is not defined in .env");
    if (!accessTokenSecret) throw new Error("ACCESS_TOKEN_SECRET is not defined in .env");
    if (!refreshTokenSecret) throw new Error("REFRESH_TOKEN_SECRET is not defined in .env");

    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB successfully!");

    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
=======
// Routes
app.use("/api/product", productRouter);
app.use("/api/brand", brandRouter);
app.use("/api/voucher", voucherRouter);
app.use("/api/category", categoryRouter);
app.use("/api/users", userRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/admin", adminReviewRouter);
app.use("/api/size", sizeRouter);
app.use("/api/color", colorRouter);
app.use("/api/order", orderRouter);
app.use("/api/cart", cartRouter);

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

// MongoDB
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    app.listen(port, () => {
      console.log(`🚀 Server running: http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
  });

