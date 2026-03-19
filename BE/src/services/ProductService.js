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

const tryParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const getAllProducts = async (search) => {
  try {
    const products = await Product.find();
    if (!search) return { status: "OK", data: products };
    const keyword = removeVietnameseTones(search);
    const filtered = products.filter((p) =>
      removeVietnameseTones(p.name).includes(keyword),
    );
    return { status: "OK", data: filtered };
  } catch (e) {
    return { status: "ERR", message: e.message };
  }
};

/** Admin: phân trang + filter + danh sách đã xóa */
const getAllProductsAdmin = async (
  limit = 10,
  page = 0,
  filterParam = {},
  isListProductRemoved = false,
) => {
  const query = {};
  if (
    isListProductRemoved === true ||
    isListProductRemoved === "1" ||
    isListProductRemoved === 1
  ) {
    query.isDeleted = true;
  } else {
    query.isDeleted = { $ne: true };
  }

  const filter =
    typeof filterParam === "string"
      ? tryParse(filterParam) || {}
      : filterParam || {};

  if (filter.brandId) query.brandId = filter.brandId;
  if (filter.categoryId) query.categoryId = filter.categoryId;
  if (filter.keyword || filter.name) {
    const text = (filter.keyword || filter.name || "").trim();
    if (text) {
      const regex = new RegExp(text, "i");
      query.$or = [{ name: { $regex: regex } }, { description: { $regex: regex } }];
    }
  }

  const skip = Number(page) * Number(limit);
  const limitNum = Number(limit) || 10;
  const [data, total] = await Promise.all([
    Product.find(query)
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
  ]);

  return {
    data,
    total,
    totalPage: Math.ceil(total / limitNum) || 1,
    page: Number(page),
    limit: limitNum,
  };
};

const getProductDetail = async (productId) => {
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

// Trả về document trực tiếp (cho controller getProductById)
const getProductById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  const product = await Product.findById(id)
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .lean();
  return product;
};

const createProduct = async (newProduct) => {
  if (!newProduct || typeof newProduct !== "object") {
    throw new Error("Invalid product payload");
  }

  const {
    name,
    description,
    brandId,
    categoryId,
    image,
    srcImages,
    price,
    countInStock,
    stock,
    hasVariants,
    variants,
    attributes,
    gender,
    style,
    isVisible,
    isFeatured,
    shortDescription,
    tags,
  } = newProduct;

  if (!name || !description) {
    throw new Error("Thiếu tên hoặc mô tả sản phẩm");
  }
  if (!brandId || !categoryId) {
    throw new Error("Thương hiệu và danh mục là bắt buộc");
  }
  if (!image) {
    throw new Error("Ảnh chính là bắt buộc");
  }

  const hasVar = !!hasVariants;
  const stockVal = stock !== undefined ? Number(stock) : (countInStock !== undefined ? Number(countInStock) : 0);
  if (!hasVar && (Number.isNaN(Number(price)) || Number(price) < 0)) {
    throw new Error("Giá sản phẩm không hợp lệ");
  }
  if (!hasVar && (Number.isNaN(stockVal) || stockVal < 0)) {
    throw new Error("Số lượng tồn kho không hợp lệ");
  }
  if (hasVar && (!Array.isArray(variants) || variants.length === 0)) {
    throw new Error("Sản phẩm có biến thể phải có ít nhất 1 biến thể");
  }

  const existingProduct = await Product.findOne({ name });
  if (existingProduct) {
    throw new Error("Tên sản phẩm đã tồn tại");
  }

  const payload = {
    name,
    description,
    brandId,
    categoryId,
    image,
    srcImages: Array.isArray(srcImages) ? srcImages : [],
    hasVariants: hasVar,
    gender: gender || "unisex",
    style: style || "",
    isVisible: isVisible !== false,
    isFeatured: !!isFeatured,
  };
  if (shortDescription) payload.shortDescription = shortDescription;
  if (Array.isArray(tags)) payload.tags = tags;
  if (Array.isArray(attributes)) payload.attributes = attributes;

  if (!hasVar) {
    payload.price = Number(price);
    payload.stock = stockVal;
  } else {
    payload.attributes = Array.isArray(attributes) && attributes.length ? attributes : [];
    payload.variants = (variants || []).map((v) => ({
      sku: v.sku || "",
      price: Number(v.price) || 0,
      stock: Number(v.stock) ?? 0,
      sold: Number(v.sold) ?? 0,
      attributes: v.attributes instanceof Map ? v.attributes : new Map(Object.entries(v.attributes || {})),
      images: Array.isArray(v.images) ? v.images : [],
      isActive: v.isActive !== false,
    }));
  }

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
  if (!product) {
    throw new Error("Product not found");
  }

  const {
    name,
    image,
    srcImages,
    description,
    shortDescription,
    brandId,
    categoryId,
    price,
    countInStock,
    stock,
    hasVariants,
    variants,
    attributes,
    gender,
    style,
    isVisible,
    isFeatured,
    tags,
  } = updateData;

  const payload = {};
  if (name !== undefined) payload.name = name;
  if (image !== undefined) payload.image = image;
  if (description !== undefined) payload.description = description;
  if (shortDescription !== undefined) payload.shortDescription = shortDescription;
  if (brandId !== undefined) payload.brandId = brandId;
  if (categoryId !== undefined) payload.categoryId = categoryId;
  if (gender !== undefined) payload.gender = gender;
  if (style !== undefined) payload.style = style;
  if (isVisible !== undefined) payload.isVisible = isVisible;
  if (isFeatured !== undefined) payload.isFeatured = isFeatured;
  if (Array.isArray(srcImages)) payload.srcImages = srcImages;
  if (Array.isArray(tags)) payload.tags = tags;
  if (Array.isArray(attributes)) payload.attributes = attributes;

  if (countInStock !== undefined || stock !== undefined) {
    const num = Number(stock !== undefined ? stock : countInStock);
    if (Number.isNaN(num) || num < 0) throw new Error("Số lượng tồn kho không hợp lệ");
    payload.stock = num;
  }
  if (price !== undefined) {
    const num = Number(price);
    if (Number.isNaN(num) || num < 0) throw new Error("Giá không hợp lệ");
    payload.price = num;
  }
  if (hasVariants !== undefined) payload.hasVariants = !!hasVariants;
  if (variants && Array.isArray(variants)) {
    payload.variants = variants.map((v) => ({
      sku: v.sku || "",
      price: Number(v.price) || 0,
      stock: Number(v.stock) ?? 0,
      sold: Number(v.sold) ?? 0,
      attributes: v.attributes instanceof Map ? v.attributes : new Map(Object.entries(v.attributes || {})),
      images: Array.isArray(v.images) ? v.images : [],
      isActive: v.isActive !== false,
    }));
  }

  if (payload.name) {
    const duplicate = await Product.findOne({ name: payload.name, _id: { $ne: productId } });
    if (duplicate) throw new Error("Tên sản phẩm đã tồn tại");
  }

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $set: payload },
    { new: true, runValidators: true },
  );
  return updated;
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

// ── GET PRODUCTS (filter + phân trang) cho trang shop FE ───────
const getProducts = async (limit = 12, page = 0, filter = {}, sort = "newest") => {
  try {
    const query = { isDeleted: { $ne: true } };

    if (filter.brandId) query.brandId = filter.brandId;
    if (filter.categoryId) query.categoryId = filter.categoryId;
    if (filter.gender) query.gender = filter.gender;
    if (filter.style) query.style = filter.style;
    if (filter.keyword) {
      const regex = new RegExp(filter.keyword.trim(), "i");
      query.$or = [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
      ];
    }
    if (filter.price && (filter.price.$gte != null || filter.price.$lte != null)) {
      query.price = {};
      if (filter.price.$gte != null) query.price.$gte = Number(filter.price.$gte);
      if (filter.price.$lte != null) query.price.$lte = Number(filter.price.$lte);
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    if (sort === "price_desc") sortOption = { price: -1 };
    if (sort === "best_seller") sortOption = { soldCount: -1 };
    if (sort === "rating") sortOption = { rating: -1 };

    const skip = Number(page) * Number(limit);
    const limitNum = Number(limit) || 12;

    const [data, total] = await Promise.all([
      Product.find(query)
        .populate("brandId", "name logo")
        .populate("categoryId", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    };
  } catch (e) {
    throw e;
  }
};

// ── GET PRODUCTS BY CATEGORY ───────────────────────────────────
const getProductsByCategory = async (categoryId) => {
  try {
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return [];
    }
    const products = await Product.find({
      categoryId,
      isDeleted: { $ne: true },
    })
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();
    return products;
  } catch (e) {
    throw e;
  }
};

// ── RELATION PRODUCTS (cùng brand hoặc category, loại trừ id) ───
const relationProduct = async (categoryId, brandId, excludeId) => {
  try {
    const query = { isDeleted: { $ne: true }, _id: { $ne: excludeId } };
    if (categoryId) query.categoryId = categoryId;
    if (brandId) query.brandId = brandId;
    const products = await Product.find(query)
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .limit(8)
      .sort({ createdAt: -1 })
      .lean();
    return products;
  } catch (e) {
    throw e;
  }
};

module.exports = {
  getAllProducts,
  getAllProductsAdmin,
  getProductDetail,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductsByCategory,
  relationProduct,
};
