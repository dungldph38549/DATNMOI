const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Kết nối MongoDB Atlas thành công");
  } catch (error) {
    console.error("Kết nối thất bại:", error);
    process.exit(1);
  }
};

module.exports = connectDB;