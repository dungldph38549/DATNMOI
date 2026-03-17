const mongoose = require("mongoose");
const Product = require("../models/ProductModel");


const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

const getAllProducts = async (search) => {
  try {

    const products = await Product.find();

    if (!search) {
      return {
        status: "OK",
        data: products
      };
    }

    const keyword = removeVietnameseTones(search);

    const filtered = products.filter((p) =>
      removeVietnameseTones(p.name).includes(keyword)
    );

    return {
      status: "OK",
      data: filtered
    };

  } catch (e) {
    return {
      status: "ERR",
      message: e.message
    };
  }
};

const getProductDetail = async (productId) => {
  try {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return {
        status: "ERR",
        message: "Invalid product id",
      };
    }

    const product = await Product.findById(productId);

    if (!product) {
      return {
        status: "ERR",
        message: "Product not found",
      };
    }

    return {
      status: "OK",
      message: "SUCCESS",
      data: product,
    };
  } catch (e) {
    throw e;
  }
};

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
    throw e;
  }
};

const updateProduct = async (productId, updateData) => {
  try {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return {
        status: "ERR",
        message: "Invalid product id",
      };
    }

    if (!updateData || typeof updateData !== "object") {
      return {
        status: "ERR",
        message: "Invalid update payload",
      };
    }

    const product = await Product.findById(productId);
    if (!product) {
      return {
        status: "ERR",
        message: "Product not found",
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
    } = updateData;

    const payload = {};

    if (name !== undefined) payload.name = name;
    if (image !== undefined) payload.image = image;
    if (type !== undefined) payload.type = type;
    if (description !== undefined) payload.description = description;
    if (rating !== undefined) payload.rating = rating;

    if (countInStock !== undefined) {
      const num = Number(countInStock);
      if (Number.isNaN(num) || num < 0) {
        return {
          status: "ERR",
          message: "countInStock must be a non-negative number",
        };
      }
      payload.countInStock = num;
    }

    if (price !== undefined) {
      const num = Number(price);
      if (Number.isNaN(num) || num < 0) {
        return {
          status: "ERR",
          message: "price must be a non-negative number",
        };
      }
      payload.price = num;
    }

    if (discount !== undefined && discount !== null) {
      const num = Number(discount);
      if (Number.isNaN(num) || num < 0) {
        return {
          status: "ERR",
          message: "discount must be a non-negative number",
        };
      }
      payload.discount = num;
    }

    if (payload.name) {
      const duplicate = await Product.findOne({
        name: payload.name,
        _id: { $ne: productId },
      });
      if (duplicate) {
        return {
          status: "ERR",
          message: "Product name already exists",
        };
      }
    }

    const updated = await Product.findByIdAndUpdate(
      productId,
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

const deleteProduct = async (productId) => {
  try {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return {
        status: "ERR",
        message: "Invalid product id",
      };
    }

    const result = await Product.findByIdAndDelete(productId);
    if (!result) {
      return {
        status: "ERR",
        message: "Product not found",
      };
    }

    return {
      status: "OK",
      message: "Delete product success",
    };
  } catch (e) {
    throw e;
  }
};

module.exports = {
  getAllProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
};
