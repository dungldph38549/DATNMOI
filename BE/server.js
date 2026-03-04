require('dotenv').config();  // Nạp biến môi trường từ tệp .env

const express = require('express');
const mongoose = require('mongoose');
const routes = require('./src/routers');  // Import các route từ thư mục routers

const app = express();
app.use(express.json());  // Middleware để parse JSON

// Kiểm tra MONGO_URI từ biến môi trường
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("MONGO_URI is not defined in .env");
  process.exit(1);  // Dừng ứng dụng nếu không có MONGO_URI
}

// Kết nối MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Failed to connect to MongoDB:", err));

// Sử dụng routes cho ứng dụng
routes(app);

// Lắng nghe trên cổng 3000 (hoặc cổng từ biến môi trường)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});