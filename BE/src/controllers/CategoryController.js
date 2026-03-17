const Category = require("../models/CategoryModel.js");
const { successResponse, errorResponse } = require("../utils/response.js");

// ── Helper: tạo slug từ tên ────────────────────────────────────
const toSlug = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// ================================================================
// CREATE  POST /category/admin/create
// Body: { name, image?, status?, slug?, description?, seoTitle?, seoDescription? }
// ================================================================
exports.create = async (req, res) => {
  try {
    const { name, image, status, slug, description, seoTitle, seoDescription } =
      req.body;

    if (!name || !name.trim()) {
      return errorResponse({
        res,
        message: "Tên danh mục không được để trống",
        statusCode: 422,
      });
    }

    // Tự tạo slug nếu không truyền lên
    const finalSlug = slug?.trim() || toSlug(name);

    // Kiểm tra slug trùng
    const existing = await Category.findOne({ slug: finalSlug });
    if (existing) {
      return errorResponse({
        res,
        message: `Slug "${finalSlug}" đã tồn tại`,
        statusCode: 409,
      });
    }

    const newCategory = new Category({
      name: name.trim(),
      image: image || "",
      status: status || "active",
      slug: finalSlug,
      description: description || "",
      seoTitle: seoTitle || "",
      seoDescription: seoDescription || "",
    });

    await newCategory.save();
    return successResponse({ res, data: newCategory, statusCode: 201 });
  } catch (err) {
    return errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// GET ALL  GET /category?status=active|inactive|all
// - Khách hàng  → GET /category            (mặc định chỉ active)
// - Admin       → GET /category?status=all  (lấy tất cả)
// ================================================================
exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = {};
    if (!status || status === "active") {
      filter.status = "active";
    } else if (status === "inactive") {
      filter.status = "inactive";
    }
    // status === "all" → không thêm filter

    const categories = await Category.find(filter).sort({ createdAt: -1 });
    return successResponse({ res, data: categories });
  } catch (err) {
    return errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// GET ONE  GET /category/:id
// ================================================================
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return errorResponse({
        res,
        message: "Không tìm thấy danh mục",
        statusCode: 404,
      });
    }
    return successResponse({ res, data: category });
  } catch (err) {
    return errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// UPDATE  PUT /category/admin/update
// Body: { id, name?, image?, status?, slug?, description?, seoTitle?, seoDescription? }
// ================================================================
exports.update = async (req, res) => {
  try {
    const {
      id,
      name,
      status,
      image,
      slug,
      description,
      seoTitle,
      seoDescription,
    } = req.body;

    if (!id) {
      return errorResponse({
        res,
        message: "ID danh mục không hợp lệ",
        statusCode: 422,
      });
    }

    // Nếu đổi slug thì kiểm tra trùng (bỏ qua chính nó)
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (image !== undefined) updateData.image = image;
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined)
      updateData.seoDescription = seoDescription;

    if (slug !== undefined) {
      const finalSlug = slug.trim() || toSlug(name || "");
      const existing = await Category.findOne({
        slug: finalSlug,
        _id: { $ne: id },
      });
      if (existing) {
        return errorResponse({
          res,
          message: `Slug "${finalSlug}" đã tồn tại`,
          statusCode: 409,
        });
      }
      updateData.slug = finalSlug;
    }

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return errorResponse({
        res,
        message: "Không tìm thấy danh mục để cập nhật",
        statusCode: 404,
      });
    }

    return successResponse({ res, data: category });
  } catch (err) {
    return errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// DELETE (hard)  DELETE /category/admin/delete
// Body: { ids: ["id1", "id2", ...] }
// ================================================================
exports.delete = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse({
        res,
        message: "Danh sách ID không hợp lệ",
        statusCode: 422,
      });
    }

    const result = await Category.deleteMany({ _id: { $in: ids } });
    return successResponse({ res, data: result });
  } catch (err) {
    return errorResponse({ res, message: err.message, statusCode: 500 });
  }
};
