const ProductService = require("../service/ProductService");
const Product = require("../model/ProductModel");


const getAllProducts = async (req, res) => {
  try {

    const search = req.query.search || "";

    const response = await ProductService.getAllProducts(search);

    return res.status(200).json(response);

  } catch (e) {

    return res.status(500).json({
      status: "ERR",
      message: e.message
    });

  }
};

const getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await ProductService.getProductDetail(id);

    if (response.status === "ERR") {
      const status =
        response.message === "Product not found" ? 404 : 400;
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

const createProduct = async (req, res) => {
  try {
    const response = await ProductService.createProduct(req.body);

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

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await ProductService.updateProduct(id, req.body);

    if (response.status === "ERR") {
      const status =
        response.message === "Product not found" ? 404 : 400;
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

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await ProductService.deleteProduct(id);

    if (response.status === "ERR") {
      const status =
        response.message === "Product not found" ? 404 : 400;
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

module.exports = {
  getAllProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
};
