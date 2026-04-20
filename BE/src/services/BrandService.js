const mongoose = require("mongoose");
const Brand = require("../models/BrandModel");

const createBrand = async (newBrand) => {
  try {
    if (!newBrand || typeof newBrand !== "object") {
      return {
        status: "ERR",
        message: "Invalid brand payload",
      };
    }

    const { name, logo, description } = newBrand;

    if (!name) {
      return {
        status: "ERR",
        message: "Missing required field: name",
      };
    }

    const existingBrand = await Brand.findOne({ name: name.trim() });
    if (existingBrand) {
      return {
        status: "ERR",
        message: "Brand name already exists",
      };
    }

    const createdBrand = await Brand.create({
      name: name.trim(),
      logo,
      description,
    });

    return {
      status: "OK",
      message: "SUCCESS",
      data: createdBrand,
    };
  } catch (e) {
    throw e;
  }
};

const getAllBrands = async () => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    return {
      status: "OK",
      message: "SUCCESS",
      data: brands,
    };
  } catch (e) {
    throw e;
  }
};

const getBrandDetail = async (brandId) => {
  try {
    if (!brandId || !mongoose.Types.ObjectId.isValid(brandId)) {
      return {
        status: "ERR",
        message: "Invalid brand id",
      };
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return {
        status: "ERR",
        message: "Brand not found",
      };
    }

    return {
      status: "OK",
      message: "SUCCESS",
      data: brand,
    };
  } catch (e) {
    throw e;
  }
};

const updateBrand = async (brandId, updateData) => {
  try {
    if (!brandId || !mongoose.Types.ObjectId.isValid(brandId)) {
      return {
        status: "ERR",
        message: "Invalid brand id",
      };
    }

    if (!updateData || typeof updateData !== "object") {
      return {
        status: "ERR",
        message: "Invalid update payload",
      };
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return {
        status: "ERR",
        message: "Brand not found",
      };
    }

    const payload = {};
    if (updateData.name !== undefined) payload.name = updateData.name.trim();
    if (updateData.logo !== undefined) payload.logo = updateData.logo;
    if (updateData.description !== undefined)
      payload.description = updateData.description;

    if (payload.name) {
      const duplicate = await Brand.findOne({
        name: payload.name,
        _id: { $ne: brandId },
      });
      if (duplicate) {
        return {
          status: "ERR",
          message: "Brand name already exists",
        };
      }
    }

    const updated = await Brand.findByIdAndUpdate(
      brandId,
      { $set: payload },
      { new: true, runValidators: true },
    );

    return {
      status: "OK",
      message: "SUCCESS",
      data: updated,
    };
  } catch (e) {
    throw e;
  }
};

const deleteBrand = async (brandId) => {
  try {
    if (!brandId || !mongoose.Types.ObjectId.isValid(brandId)) {
      return {
        status: "ERR",
        message: "Invalid brand id",
      };
    }

    const result = await Brand.findByIdAndDelete(brandId);
    if (!result) {
      return {
        status: "ERR",
        message: "Brand not found",
      };
    }

    return {
      status: "OK",
      message: "Delete brand success",
    };
  } catch (e) {
    throw e;
  }
};

// Xóa nhiều thương hiệu
const deleteBrands = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        status: "ERR",
        message: "Danh sách ID không hợp lệ",
      };
    }

    // Validate all IDs
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          status: "ERR",
          message: `ID không hợp lệ: ${id}`,
        };
      }
    }

    const result = await Brand.deleteMany({ _id: { $in: ids } });

    return {
      status: "OK",
      message: `Xóa thành công ${result.deletedCount} thương hiệu`,
      data: { deletedCount: result.deletedCount },
    };
  } catch (e) {
    throw e;
  }
};

module.exports = {
  createBrand,
  getAllBrands,
  getBrandDetail,
  updateBrand,
  deleteBrand,
  deleteBrands,
};
