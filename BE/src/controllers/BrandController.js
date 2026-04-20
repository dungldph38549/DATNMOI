const BrandService = require("../services/BrandService");

const createBrand = async (req, res) => {
  try {
    const response = await BrandService.createBrand(req.body);

    if (response.status === "ERR") {
      return res.status(400).json(response);
    }

    return res.status(201).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const getAllBrands = async (req, res) => {
  try {
    const response = await BrandService.getAllBrands();
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const getBrandDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await BrandService.getBrandDetail(id);

    if (response.status === "ERR") {
      const status = response.message === "Brand not found" ? 404 : 400;
      return res.status(status).json(response);
    }

    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const updateBrand = async (req, res) => {
  try {
    // Route `PUT /admin/update` không có `:id` nên FE gửi id trong body
    const { id: idFromParams } = req.params || {};
    const { id: idFromBody } = req.body || {};
    const id = idFromParams || idFromBody;
    const response = await BrandService.updateBrand(id, req.body);

    if (response.status === "ERR") {
      const status = response.message === "Brand not found" ? 404 : 400;
      return res.status(status).json(response);
    }

    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await BrandService.deleteBrand(id);

    if (response.status === "ERR") {
      const status = response.message === "Brand not found" ? 404 : 400;
      return res.status(status).json(response);
    }

    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
  }
};

// Xóa nhiều thương hiệu
const deleteBrands = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: "ERR",
        message: "Danh sách ID không hợp lệ",
      });
    }

    const response = await BrandService.deleteBrands(ids);

    if (response.status === "ERR") {
      return res.status(400).json(response);
    }

    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      message: e.message || "Internal server error",
    });
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
