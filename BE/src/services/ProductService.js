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

// GET /product/admin/get-all
// Controller đang gọi theo signature: (limit, page, filter, isListProductRemoved)
const getAllProducts = async (
  limit = 10,
  page = 0,
  filter = {},
  isListProductRemoved = 0,
) => {
  const includeRemoved =
    isListProductRemoved === "1" ||
    isListProductRemoved === 1 ||
    isListProductRemoved === true;

  const parsedFilter =
    typeof filter === "string"
      ? (() => {
          try {
            return JSON.parse(filter);
          } catch {
            return {};
          }
        })()
      : filter || {};

  const query = includeRemoved
    ? {}
    : {
        isDeleted: { $ne: true },
      };

  if (parsedFilter?.name?.trim()) {
    const keyword = parsedFilter.name.trim();
    query.name = new RegExp(keyword, "i");
  }
  if (parsedFilter?.categoryId) query.categoryId = parsedFilter.categoryId;
  if (parsedFilter?.brandId) query.brandId = parsedFilter.brandId;

  const priceFrom = parsedFilter?.priceFrom;
  const priceTo = parsedFilter?.priceTo;
  if (priceFrom !== undefined || priceTo !== undefined) {
    const range = {};
    const min = priceFrom !== undefined ? Number(priceFrom) : undefined;
    const max = priceTo !== undefined ? Number(priceTo) : undefined;
    if (min !== undefined && !Number.isNaN(min)) range.$gte = min;
    if (max !== undefined && !Number.isNaN(max)) range.$lte = max;

    // Lọc theo sản phẩm không variant hoặc theo giá variant (xấp xỉ)
    if (Object.keys(range).length) {
      query.$or = [
        { hasVariants: false, price: range },
        { hasVariants: true, variants: { $elemMatch: { price: range } } },
      ];
    }
  }

  const [total, items] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .populate("brandId", "name")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip(Number(page) * Number(limit))
      .limit(Number(limit)),
  ]);

  return {
    data: items,
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

// GET /product/:id
// Trả về document để FE setFieldsValue đúng type (brandId/categoryId là ObjectId)
const getProductById = async (productId) => {
  try {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return null;
    }

    const product = await Product.findById(productId);

    return product || null;
  } catch (e) {
    throw e;
  }
};

const createProduct = async (newProduct) => {
  if (!newProduct || typeof newProduct !== "object") {
    throw new Error("Invalid product payload");
  }

  // FE đang gửi `countInStock`, nhưng ProductModel mới dùng `stock`
  const payload = { ...newProduct };
  if (payload.countInStock !== undefined && payload.stock === undefined) {
    payload.stock = Number(payload.countInStock);
    delete payload.countInStock;
  }

  if (payload.price !== undefined) payload.price = Number(payload.price);
  if (payload.stock !== undefined) payload.stock = Number(payload.stock);

  // Chuẩn hoá variants (nếu có)
  if (Array.isArray(payload.variants)) {
    payload.variants = payload.variants.map((v) => ({
      ...v,
      price: v?.price !== undefined ? Number(v.price) : v.price,
      stock: v?.stock !== undefined ? Number(v.stock) : v.stock,
    }));
  }

  if (payload.name) {
    const existingProduct = await Product.findOne({ name: payload.name });
    if (existingProduct) throw new Error("Product name already exists");
  }

  // Dùng đúng schema `src/models/ProductModel.js`
  const createdProduct = await Product.create(payload);
  return createdProduct;
};

const updateProduct = async (productId, updateData) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product id");
  }
  if (!updateData || typeof updateData !== "object") {
    throw new Error("Invalid update payload");
  }

  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  const payload = { ...updateData };
  if (payload.countInStock !== undefined && payload.stock === undefined) {
    payload.stock = Number(payload.countInStock);
    delete payload.countInStock;
  }
  if (payload.price !== undefined) payload.price = Number(payload.price);
  if (payload.stock !== undefined) payload.stock = Number(payload.stock);

  if (Array.isArray(payload.variants)) {
    payload.variants = payload.variants.map((v) => ({
      ...v,
      price: v?.price !== undefined ? Number(v.price) : v.price,
      stock: v?.stock !== undefined ? Number(v.stock) : v.stock,
    }));
  }

  if (payload.name && payload.name !== product.name) {
    const duplicate = await Product.findOne({ name: payload.name });
    if (duplicate && duplicate._id.toString() !== productId.toString()) {
      throw new Error("Product name already exists");
    }
  }

  // Gán field trực tiếp vào document để trigger đủ validators/presave
  Object.assign(product, payload);
  await product.save();
  return product;
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
  getProductById,
  // giữ lại export cũ (nếu chỗ nào khác còn gọi)
  getProductDetail: getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
