require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./src/models/UserModel"); // Kiểm tra xem đường dẫn này có đúng tới file Model của bạn không

const createAdmin = async () => {
  try {
    const mongoURI = process.env.MONGO_DB;
    if (!mongoURI) {
      throw new Error("MONGO_DB chưa được định nghĩa trong file .env");
    }

    console.log("⏳ Đang kết nối Database...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối Database thành công!");

    // Kiểm tra xem admin đã tồn tại chưa
    const adminExists = await User.findOne({ email: "admin@gmail.com" });
    if (adminExists) {
      console.log("⚠️ Tài khoản Admin đã tồn tại rồi.");
      process.exit();
    }

    // Tạo mật khẩu mã hóa
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const newAdmin = new User({
      name: "Admin Hệ Thống",
      email: "admin@gmail.com",
      password: "admin123", // để UserModel tự hash trong pre('save')
      isAdmin: true,
      role: "admin",
    });
    await newAdmin.save();
    console.log("------------------------------------------");
    console.log("✅ TẠO TÀI KHOẢN ADMIN THÀNH CÔNG!");
    console.log("📧 Email: admin@gmail.com");
    console.log("🔑 Password: admin123");
    console.log("------------------------------------------");

    process.exit();
  } catch (error) {
    console.error("❌ Lỗi khi tạo Admin:", error.message);
    process.exit(1);
  }
};

createAdmin();
