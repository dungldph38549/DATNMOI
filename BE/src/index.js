const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const productRouter = require("./routers/ProductRouter");
const brandRouter = require("./routers/BrandRouter");

dotenv.config({ quiet: true });

const app = express();

app.use(express.json()); // 👈 bắt buộc cho POST

const port = process.env.PORT || 3001;
const mongoURI = process.env.MONGO_DB;

if (!mongoURI) {
  console.error("MONGO_DB is not defined in .env");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("Hello");
});

// Product routes
app.use("/api/product", productRouter);
// Brand routes
app.use("/api/brand", brandRouter);

mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect MongoDB:", err.message);
    process.exit(1);
  });

app.listen(port, () => {
  console.log("Server is running on port", port);
});
