// ================================================================
// models/Warehouse.js
// ================================================================
const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên kho không được để trống"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Mã kho không được để trống"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    location: {
      address: { type: String, default: null },
      city: { type: String, default: null },
      province: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    phone: { type: String, default: null },
    email: { type: String, default: null },

    // Tích hợp ERP/WMS ngoài
    externalId: { type: String, default: null }, // ID bên hệ thống ngoài
    externalType: {
      type: String,
      enum: ["ERP", "WMS", "manual", null],
      default: null,
    },
    lastSyncAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false }, // kho mặc định
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ================================================================
// INDEXES
// ================================================================
warehouseSchema.index({ code: 1 });
warehouseSchema.index({ isActive: 1 });
warehouseSchema.index({ externalId: 1 });

// ================================================================
// STATIC
// ================================================================
warehouseSchema.statics.getDefault = function () {
  return this.findOne({ isDefault: true, isActive: true });
};

warehouseSchema.statics.getActive = function () {
  return this.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
};

module.exports = mongoose.model("Warehouse", warehouseSchema);
