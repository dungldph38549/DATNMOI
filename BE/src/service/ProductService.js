const Product = require("../model/ProductModel");

const createProduct = async (newProduct) => {
  try {
    if (!newProduct || typeof newProduct !== "object") {
      return {
        status: "ERR",
        message: "Invalid product payload",
      };
    }

    const {
      name,
      image,
      type,
      countInStock,
      price,
      rating,
      description,
      discount,
    } = newProduct;

    // Basic required-field validation
    if (!name || !price || !type) {
      return {
        status: "ERR",
        message: "Missing required fields: name, price or type",
      };
    }

    const numericCountInStock =
      countInStock !== undefined ? Number(countInStock) : 0;
    const numericDiscount =
      discount !== undefined && discount !== null ? Number(discount) : 0;

    if (Number.isNaN(numericCountInStock) || numericCountInStock < 0) {
      return {
        status: "ERR",
        message: "countInStock must be a non-negative number",
      };
    }

    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      return {
        status: "ERR",
        message: "price must be a non-negative number",
      };
    }

    if (Number.isNaN(numericDiscount) || numericDiscount < 0) {
      return {
        status: "ERR",
        message: "discount must be a non-negative number",
      };
    }

    // Check duplicate name
    const existingProduct = await Product.findOne({ name });

    if (existingProduct) {
      return {
        status: "ERR",
        message: "Product name already exists",
      };
    }

    const createdProduct = await Product.create({
      name,
      image,
      type,
      countInStock: numericCountInStock,
      price: Number(price),
      rating,
      description,
      discount: numericDiscount,
    });

    return {
      status: "OK",
      message: "SUCCESS",
      data: createdProduct,
    };
  } catch (e) {
    // Giữ nguyên hành vi: ném lỗi ra ngoài cho tầng controller/middleware xử lý
    throw e;
  }
};

module.exports = {
  createProduct,
};
