// index.js
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const productRouter = require("./src/routers/ProductRouter");
const brandRouter = require("./src/routers/BrandRouter");
const voucherRouter = require("./src/routers/VoucherRouter");
const categoryRouter = require("./src/routers/CategoryRouter"); // Import CategoryRouter

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
app.use("/api/category", categoryRouter); // Sử dụng CategoryRouter cho đường dẫn /api/category

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