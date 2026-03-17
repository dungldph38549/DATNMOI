const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên danh mục là bắt buộc"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Ảnh danh mục là bắt buộc"],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Trạng thái phải là 'active' hoặc 'inactive'",
      },
      default: "active",
      required: [true, "Trạng thái là bắt buộc"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", CategorySchema);
