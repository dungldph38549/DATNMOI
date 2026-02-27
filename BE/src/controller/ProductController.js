const ProductService = require("../service/ProductService");

const createProduct = async (req, res) => {
  try {
    const response = await ProductService.createProduct(req.body);

    if (response.status === "ERR") {
      // Service đã chuẩn hoá message, controller chỉ map sang HTTP status
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

module.exports = {
  createProduct,
};
