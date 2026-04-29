const mongoose = require("mongoose");

const BannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề banner là bắt buộc"],
      trim: true,
      maxlength: [200, "Tiêu đề banner không được vượt quá 200 ký tự"],
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Mô tả banner không được vượt quá 500 ký tự"],
    },
    image: {
      type: String,
      required: [true, "Ảnh banner là bắt buộc"],
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, "Thứ tự hiển thị phải lớn hơn hoặc bằng 0"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

BannerSchema.pre("save", function preSave() {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
  }
  return Promise.resolve();
});

module.exports = mongoose.model("Banner", BannerSchema);
