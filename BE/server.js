require('dotenv').config();  // Nạp các biến môi trường từ tệp .env
const express = require('express');
const mongoose = require('mongoose');
const routes = require('./src/routers');

const app = express();
app.use(express.json());

// Kết nối MongoDB từ biến môi trường
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Failed to connect to MongoDB:", err));

// Sử dụng routes cho ứng dụng
routes(app);

// Lắng nghe trên cổng
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});