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
