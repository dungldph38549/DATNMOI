require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const routes = require("./src/routers");

const app = express();

// CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Parse JSON
app.use(express.json());

// ✅ Cho phép truy cập ảnh trong thư mục uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ Failed to connect MongoDB:", err);
    process.exit(1);
  });

// Routes
routes(app);

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});