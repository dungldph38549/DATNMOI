require("dotenv").config();
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors"); // ⭐ thêm dòng này

const productRouter = require("./src/routers/ProductRouter");
const brandRouter = require("./src/routers/BrandRouter");
const voucherRouter = require("./src/routers/VoucherRouter");
const categoryRouter = require("./src/routers/CategoryRouter");

const reviewRouter = require("./src/routers/ReviewRouter");
const adminReviewRouter = require("./src/routers/adminReviewRoutes");
const sizeRouter = require("./src/routers/SizeRouter");
const colorRouter = require("./src/routers/ColorRouter");
const orderRouter = require("./src/routers/OrderRouter");

dotenv.config();

const app = express();

// ⭐ thêm CORS ở đây
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

const port = process.env.PORT || 3001;
const mongoURI = process.env.MONGO_DB;

if (!mongoURI) {
  console.error("MONGO_DB is not defined in .env");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("Hello API");
});

// routes
app.use("/api/product", productRouter);
app.use("/api/brand", brandRouter);
app.use("/api/voucher", voucherRouter);
app.use("/api/category", categoryRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/admin", adminReviewRouter);
app.use("/api/size", sizeRouter);
app.use("/api/color", colorRouter);
app.use("/api/order", orderRouter);

// connect mongodb
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    app.listen(port, () => {
      console.log("🚀 Server running at port", port);
    });
  })
  .catch((err) => {
    console.error("MongoDB error:", err.message);
  });