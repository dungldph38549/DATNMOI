
// index.js
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");

const productRouter = require("./src/routers/ProductRouter");
const brandRouter = require("./src/routers/BrandRouter");
const voucherRouter = require("./src/routers/VoucherRouter");
const categoryRouter = require("./src/routers/CategoryRouter");
const userRouter = require("./src/routers/UserRouter"); // ✅ Đưa lên đây
const reviewRouter = require("./src/routers/ReviewRouter");
const adminReviewRouter = require("./src/routers/adminReviewRoutes");
const sizeRouter = require("./src/routers/SizeRouter");
const colorRouter = require("./src/routers/ColorRouter");

dotenv.config(); // Đọc các biến từ file .env

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;
const mongoURI = process.env.MONGO_URL;

if (!mongoURI) {
  console.error("MONGO_URL is not defined in .env");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("Hello API");
});

//  Mount tất cả router ở đây
app.use("/api/product", productRouter);
app.use("/api/brand", brandRouter);
app.use("/api/voucher", voucherRouter);
app.use("/api/category", categoryRouter);
app.use("/api/users", userRouter); 
app.use("/api/reviews", reviewRouter); //
app.use("/api/admin", adminReviewRouter);//
app.use("/api/size", sizeRouter);//
app.use("/api/color", colorRouter);//


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
