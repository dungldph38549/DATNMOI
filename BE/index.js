<<<<<<< HEAD
=======

// index.js
>>>>>>> fd3d9ba429c3a0e1bfd74da3870e21eab31148bf
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors"); // ⭐ thêm dòng này

const productRouter = require("./src/routers/ProductRouter");
const brandRouter = require("./src/routers/BrandRouter");
const voucherRouter = require("./src/routers/VoucherRouter");
const categoryRouter = require("./src/routers/CategoryRouter");
const userRouter = require("./src/routers/UserRouter"); // ✅ Đưa lên đây
const reviewRouter = require("./src/routers/ReviewRouter");
const adminReviewRouter = require("./src/routers/adminReviewRoutes");
const sizeRouter = require("./src/routers/SizeRouter");
const colorRouter = require("./src/routers/ColorRouter");
const orderRouter = require("./src/routers/OrderRouter");

dotenv.config();

const app = express();
<<<<<<< HEAD

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
=======
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;
const mongoURI = process.env.MONGO_URL;
>>>>>>> fd3d9ba429c3a0e1bfd74da3870e21eab31148bf

if (!mongoURI) {
  console.error("MONGO_URL is not defined in .env");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("Hello API");
});

<<<<<<< HEAD
// routes
=======
//  Mount tất cả router ở đây
>>>>>>> fd3d9ba429c3a0e1bfd74da3870e21eab31148bf
app.use("/api/product", productRouter);
app.use("/api/brand", brandRouter);
app.use("/api/voucher", voucherRouter);
app.use("/api/category", categoryRouter);
<<<<<<< HEAD
app.use("/api/reviews", reviewRouter);
app.use("/api/admin", adminReviewRouter);
app.use("/api/size", sizeRouter);
app.use("/api/color", colorRouter);
app.use("/api/order", orderRouter);

// connect mongodb
=======
app.use("/api/users", userRouter); 
app.use("/api/reviews", reviewRouter); //
app.use("/api/admin", adminReviewRouter);//
app.use("/api/size", sizeRouter);//
app.use("/api/color", colorRouter);//


// Kết nối MongoDB và khởi động server
>>>>>>> fd3d9ba429c3a0e1bfd74da3870e21eab31148bf
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