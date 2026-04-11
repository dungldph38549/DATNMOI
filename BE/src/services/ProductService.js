// ================================================================
// services/ProductService.js — SneakerConverse
// ================================================================
const mongoose = require("mongoose");
const Product = require("../models/ProductModel");
const { enrichProductPricing, normalizeSaleRules } = require("../utils/salePricing");

// ── Helpers ────────────────────────────────────────────────────
const tryParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const toNum = (val, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) || n < 0 ? fallback : n;
};

const normalizeVariants = (variants) =>
  (variants || []).map((v) => ({
    sku: (v.sku || "").toString().trim(),
    price: toNum(v.price, 0),
    stock: toNum(v.stock, 0),
    sold: toNum(v.sold, 0),
    attributes:
      v.attributes instanceof Map
        ? v.attributes
        : new Map(Object.entries(v.attributes || {})),
    images: Array.isArray(v.images) ? v.images : [],
    isActive: v.isActive !== false,
  }));

const normalizeSaleRulesInput = (saleRules) =>
  normalizeSaleRules(Array.isArray(saleRules) ? saleRules : []);

const baseProductQuery = {
  isDeleted: { $ne: true },
  isActive: true,
  isVisible: true,
  status: { $ne: "inactive" },
};

const getComparablePrice = (product) => {
  if (!product) return 0;
  if (product.hasVariants && Array.isArray(product.variants)) {
    const activePrices = product.variants
      .filter((v) => v?.isActive !== false && Number(v?.price) > 0)
      .map((v) => Number(v.price));
    if (activePrices.length) return Math.min(...activePrices);
  }
  return Number(product.price || 0);
};

const computeSimilarityScore = (base, candidate) => {
  if (!base || !candidate) return 0;
  const CATEGORY_WEIGHT = 0.6;
  const BRAND_WEIGHT = 0.25;
  const PRICE_WEIGHT = 0.15;

  let score = 0;

  if (String(base.categoryId) === String(candidate.categoryId)) {
    score += CATEGORY_WEIGHT;
  }
  if (String(base.brandId) === String(candidate.brandId)) {
    score += BRAND_WEIGHT;
  }

  const basePrice = getComparablePrice(base);
  const candidatePrice = getComparablePrice(candidate);
  if (basePrice > 0 && candidatePrice > 0) {
    const diffRatio = Math.abs(candidatePrice - basePrice) / basePrice;
    if (diffRatio <= 0.2) {
      score += PRICE_WEIGHT * (1 - diffRatio / 0.2);
    }
  }

  return Number(score.toFixed(4));
};

// ================================================================
// GET ALL — Admin (phân trang + filter + soft delete)
// ================================================================
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
    typeof filter === "string" ? tryParse(filter) || {} : filter || {};

  const query = includeRemoved ? {} : { isDeleted: { $ne: true } };

  if (parsedFilter?.name?.trim())
    query.name = new RegExp(parsedFilter.name.trim(), "i");

  if (parsedFilter?.keyword?.trim()) {
    const regex = new RegExp(parsedFilter.keyword.trim(), "i");
    query.$or = [{ name: regex }, { description: regex }];
  }
  if (parsedFilter?.categoryId) query.categoryId = parsedFilter.categoryId;
  if (parsedFilter?.brandId) query.brandId = parsedFilter.brandId;

  const priceFrom = parsedFilter?.priceFrom;
  const priceTo = parsedFilter?.priceTo;
  if (priceFrom !== undefined || priceTo !== undefined) {
    const range = {};
    const min = priceFrom !== undefined ? Number(priceFrom) : undefined;
    const max = priceTo !== undefined ? Number(priceTo) : undefined;
    if (min !== undefined && !isNaN(min)) range.$gte = min;
    if (max !== undefined && !isNaN(max)) range.$lte = max;
    if (Object.keys(range).length) {
      query.$or = [
        { hasVariants: false, price: range },
        { hasVariants: true, variants: { $elemMatch: { price: range } } },
      ];
    }
  }

  const limitNum = Number(limit) || 10;
  const skip = Number(page) * limitNum;

  const [total, items] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    data: items.map((item) => enrichProductPricing(item)),
    total,
    page: Number(page),
    limit: limitNum,
    totalPage: Math.ceil(total / limitNum) || 1,
  };
};

const getAllProductsAdmin = getAllProducts;

// ================================================================
// GET BY ID
// ================================================================
const getProductById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  const product = await Product.findById(id)
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .lean();
  return product ? enrichProductPricing(product) : null;
};

const getProductDetail = getProductById;

// ================================================================
// CREATE
// ================================================================
const createProduct = async (newProduct) => {
  if (!newProduct || typeof newProduct !== "object")
    throw new Error("Invalid product payload");

  const {
    name,
    description,
    shortDescription,
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
    tags,
    saleRules,
  } = newProduct;

  if (!name || !description) throw new Error("Thiếu tên hoặc mô tả sản phẩm");
  if (!brandId || !categoryId)
    throw new Error("Thương hiệu và danh mục là bắt buộc");
  if (!image) throw new Error("Ảnh chính là bắt buộc");

  const hasVar = !!hasVariants;
  const stockVal = stock !== undefined ? toNum(stock) : toNum(countInStock);

  if (!hasVar && toNum(price) < 0) throw new Error("Giá sản phẩm không hợp lệ");
  if (!hasVar && stockVal < 0) throw new Error("Số lượng tồn kho không hợp lệ");
  if (hasVar && (!Array.isArray(variants) || variants.length === 0))
    throw new Error("Sản phẩm có biến thể phải có ít nhất 1 biến thể");

  const existing = await Product.findOne({ name });
  if (existing) throw new Error("Tên sản phẩm đã tồn tại");

  const payload = {
    name,
    description,
    shortDescription: shortDescription || "",
    brandId,
    categoryId,
    image,
    srcImages: Array.isArray(srcImages) ? srcImages : [],
    hasVariants: hasVar,
    gender: gender || "unisex",
    style: style || "",
    isVisible: isVisible !== false,
    isFeatured: !!isFeatured,
    tags: Array.isArray(tags) ? tags : [],
    attributes: Array.isArray(attributes) ? attributes : [],
    saleRules: normalizeSaleRulesInput(saleRules),
  };

  if (!hasVar) {
    payload.price = toNum(price);
    payload.stock = stockVal;
  } else {
    payload.variants = normalizeVariants(variants);
  }

  return Product.create(payload);
};

// ================================================================
// UPDATE
// ================================================================
const updateProduct = async (productId, updateData) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId))
    throw new Error("Invalid product id");
  if (!updateData || typeof updateData !== "object")
    throw new Error("Invalid update payload");

  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

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
    saleRules,
  } = updateData;

  const payload = {};

  if (name !== undefined) payload.name = name;
  if (image !== undefined) payload.image = image;
  if (description !== undefined) payload.description = description;
  if (shortDescription !== undefined)
    payload.shortDescription = shortDescription;
  if (brandId !== undefined) payload.brandId = brandId;
  if (categoryId !== undefined) payload.categoryId = categoryId;
  if (gender !== undefined) payload.gender = gender;
  if (style !== undefined) payload.style = style;
  if (isVisible !== undefined) payload.isVisible = isVisible;
  if (isFeatured !== undefined) payload.isFeatured = isFeatured;
  if (hasVariants !== undefined) payload.hasVariants = !!hasVariants;
  if (Array.isArray(srcImages)) payload.srcImages = srcImages;
  if (Array.isArray(tags)) payload.tags = tags;
  if (Array.isArray(attributes)) payload.attributes = attributes;
  if (saleRules !== undefined) payload.saleRules = normalizeSaleRulesInput(saleRules);

  if (countInStock !== undefined || stock !== undefined) {
    const num = toNum(stock !== undefined ? stock : countInStock);
    payload.stock = num;
  }
  if (price !== undefined) {
    const num = toNum(price);
    if (num < 0) throw new Error("Giá không hợp lệ");
    payload.price = num;
  }
  if (variants && Array.isArray(variants)) {
    payload.variants = normalizeVariants(variants);
  }

  if (payload.name) {
    const dup = await Product.findOne({
      name: payload.name,
      _id: { $ne: productId },
    });
    if (dup) throw new Error("Tên sản phẩm đã tồn tại");
  }

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $set: payload },
    { new: true, runValidators: true },
  );
  return enrichProductPricing(updated);
};

// ================================================================
// DELETE (soft)
// ================================================================
const deleteProduct = async (productId) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId))
    throw new Error("Invalid product id");

  const result = await Product.findByIdAndUpdate(
    productId,
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );
  if (!result) throw new Error("Product not found");
  return { status: "OK", message: "Xóa sản phẩm thành công" };
};

// ================================================================
// GET PRODUCTS — Trang shop FE
// ================================================================
const getProducts = async (
  limit = 12,
  page = 0,
  filter = {},
  sort = "newest",
) => {
  const query = { isDeleted: { $ne: true } };

  if (filter.brandId) query.brandId = filter.brandId;
  if (filter.categoryId) query.categoryId = filter.categoryId;
  if (filter.gender) query.gender = filter.gender;
  if (filter.style) query.style = filter.style;
  if (filter.keyword) {
    const regex = new RegExp(filter.keyword.trim(), "i");
    query.$or = [{ name: regex }, { description: regex }];
  }
  if (filter.price) {
    query.price = {};
    if (filter.price.$gte != null) query.price.$gte = Number(filter.price.$gte);
    if (filter.price.$lte != null) query.price.$lte = Number(filter.price.$lte);
  }

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    best_seller: { soldCount: -1 },
    rating: { rating: -1 },
  };
  const sortOption = sortMap[sort] || { createdAt: -1 };
  const limitNum = Number(limit) || 12;
  const skip = Number(page) * limitNum;

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
    data: data.map((item) => enrichProductPricing(item)),
    total,
    page: Number(page),
    limit: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
};

// ================================================================
// GET BY CATEGORY
// ================================================================
const getProductsByCategory = async (categoryId) => {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) return [];
  const data = await Product.find({ categoryId, isDeleted: { $ne: true } })
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .lean();
  return data.map((item) => enrichProductPricing(item));
};

// ================================================================
// RELATION
// ================================================================
const relationProduct = async (categoryId, brandId, excludeId) => {
  const query = { isDeleted: { $ne: true }, _id: { $ne: excludeId } };
  if (categoryId) query.categoryId = categoryId;
  if (brandId) query.brandId = brandId;
  const data = await Product.find(query)
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
  return data.map((item) => enrichProductPricing(item));
};

// ================================================================
// RECOMMENDATIONS — Content-based Filtering
// ================================================================
const getRecommendations = async (productId, limit = 4) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) return [];

  const baseProduct = await Product.findOne({
    ...baseProductQuery,
    _id: productId,
  })
    .select("_id name categoryId brandId price hasVariants variants createdAt soldCount")
    .lean();
  if (!baseProduct) return [];

  const candidates = await Product.find({
    ...baseProductQuery,
    _id: { $ne: productId },
    $or: [
      { categoryId: baseProduct.categoryId },
      { brandId: baseProduct.brandId },
    ],
  })
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .limit(120)
    .lean();

  const ranked = candidates
    .map((item) => ({
      ...item,
      _similarityScore: computeSimilarityScore(baseProduct, item),
    }))
    .filter((item) => item._similarityScore > 0)
    .sort(
      (a, b) =>
        b._similarityScore - a._similarityScore ||
        Number(b.soldCount || 0) - Number(a.soldCount || 0) ||
        new Date(b.createdAt) - new Date(a.createdAt),
    )
    .slice(0, Math.max(1, Number(limit) || 4))
    .map((item) => {
      const { _similarityScore, ...rest } = item;
      return enrichProductPricing(rest);
    });

  if (ranked.length >= limit) return ranked;

  const fallback = await Product.find({
    ...baseProductQuery,
    _id: { $ne: productId, $nin: ranked.map((p) => p._id) },
    categoryId: baseProduct.categoryId,
  })
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(limit - ranked.length)
    .lean();

  return [...ranked, ...fallback.map((item) => enrichProductPricing(item))].slice(
    0,
    limit,
  );
};

const recordViewedProduct = async (userId, productId) => {
  if (
    !userId ||
    !productId ||
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(productId)
  ) {
    return false;
  }
  const User = require("../models/UserModel");
  await User.updateOne(
    { _id: userId },
    { $pull: { viewedProducts: { productId } } },
  );
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        viewedProducts: {
          $each: [{ productId, viewedAt: new Date() }],
          $slice: -30,
        },
      },
    },
  );
  return true;
};

const getHomeRecommendations = async ({ userId, limit = 8 } = {}) => {
  const safeLimit = Math.max(1, Number(limit) || 8);
  const fallbackQuery = Product.find(baseProductQuery)
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(safeLimit)
    .lean();

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const fallback = await fallbackQuery;
    return fallback.map((item) => enrichProductPricing(item));
  }

  const User = require("../models/UserModel");
  const user = await User.findById(userId).select("viewedProducts").lean();
  const viewedItems = Array.isArray(user?.viewedProducts) ? user.viewedProducts : [];
  if (!viewedItems.length) {
    const fallback = await fallbackQuery;
    return fallback.map((item) => enrichProductPricing(item));
  }

  const viewedIds = viewedItems
    .map((v) => String(v?.productId || ""))
    .filter(Boolean);
  const viewedProducts = await Product.find({
    ...baseProductQuery,
    _id: { $in: viewedIds },
  })
    .select("_id categoryId brandId price hasVariants variants")
    .lean();

  if (!viewedProducts.length) {
    const fallback = await fallbackQuery;
    return fallback.map((item) => enrichProductPricing(item));
  }

  const categoryIds = [...new Set(viewedProducts.map((p) => String(p.categoryId)))];
  const brandIds = [...new Set(viewedProducts.map((p) => String(p.brandId)))];

  const candidates = await Product.find({
    ...baseProductQuery,
    _id: { $nin: viewedIds },
    $or: [
      { categoryId: { $in: categoryIds } },
      { brandId: { $in: brandIds } },
    ],
  })
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .limit(180)
    .lean();

  const ranked = candidates
    .map((item) => {
      const score = viewedProducts.reduce(
        (max, base) => Math.max(max, computeSimilarityScore(base, item)),
        0,
      );
      return { ...item, _similarityScore: score };
    })
    .filter((item) => item._similarityScore > 0)
    .sort(
      (a, b) =>
        b._similarityScore - a._similarityScore ||
        Number(b.soldCount || 0) - Number(a.soldCount || 0) ||
        new Date(b.createdAt) - new Date(a.createdAt),
    )
    .slice(0, safeLimit)
    .map((item) => enrichProductPricing(item));

  if (ranked.length >= safeLimit) return ranked.slice(0, safeLimit);

  const rankedIds = ranked.map((p) => p._id);
  const fallback = await Product.find({
    ...baseProductQuery,
    _id: { $nin: [...viewedIds, ...rankedIds] },
  })
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(safeLimit - ranked.length)
    .lean();

  return [...ranked, ...fallback.map((item) => enrichProductPricing(item))].slice(
    0,
    safeLimit,
  );
};

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
  getAllProducts,
  getAllProductsAdmin,
  getProductById,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductsByCategory,
  relationProduct,
  getRecommendations,
  getHomeRecommendations,
  recordViewedProduct,
};
