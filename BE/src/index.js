const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const productRouter = require("./routers/ProductRouter");
const brandRouter = require("./routers/BrandRouter");
const voucherRouter = require("./routers/VoucherRouter");

dotenv.config();

const app = express();

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

app.use("/api/product", productRouter);
app.use("/api/brand", brandRouter);
app.use("/api/voucher", voucherRouter);

// connect DB rồi mới chạy server
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