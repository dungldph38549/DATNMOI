const Product = require("../models/ProductModel.js");
const ProductService = require("../services/ProductService");
const { successResponse, errorResponse } = require("../utils/response.js");

// ================================================================
// CREATE — Tạo sản phẩm mới
// POST /api/product/create
// Body: { name, brandId, categoryId, price, countInStock, description,
//         image, srcImages, hasVariants, variants, attributes,
//         gender, style, isVisible, isFeatured }
// ================================================================
exports.createProduct = async (req, res) => {
  try {
    // Hỗ trợ cả 2 kiểu payload:
    // 1) { payload: {...} } (FE hiện tại)
    // 2) {...}            (test bằng Postman / script)
    const input = req.body?.payload ?? req.body;
    const newProduct = await ProductService.createProduct(input);
    successResponse({ res, data: newProduct, statusCode: 201 });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ================================================================
// GET (filter + phân trang) — Dành cho trang shop của khách
// POST /api/product/get-products
// Body: { limit, page, sort, brandId, categoryId, keyword,
//         gender, style, minPrice, maxPrice, sizes, colors }
// ================================================================
exports.getProducts = async (req, res) => {
  try {
    const {
      limit,
      page,
      sort,
      brandId,
      categoryId,
      keyword,
      gender,
      style,
      minPrice,
      maxPrice,
      sizes,
      colors,
    } = req.body;

    const filter = {};
    if (brandId) filter.brandId = brandId;
    if (categoryId) filter.categoryId = categoryId;
    if (keyword) filter.keyword = keyword;
    if (gender) filter.gender = gender; // nam / nữ / unisex
    if (style) filter.style = style; // running / lifestyle / basketball ...
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (sizes?.length) filter.sizes = sizes; // [39, 40, 41]
    if (colors?.length) filter.colors = colors; // ["Đỏ", "Đen"]

    const products = await ProductService.getProducts(
      Number(limit) || 12,
      Number(page) || 0,
      filter,
      sort, // newest | price_asc | price_desc | best_seller | rating
    );
    res.json(products);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ================================================================
// GET ALL (admin) — Quản lý toàn bộ sản phẩm (bao gồm đã ẩn)
// GET /api/product/admin/get-all
// Query: { limit, page, filter, isListProductRemoved }
// ================================================================
exports.getAllProducts = async (req, res) => {
  try {
    const { limit, page, filter, isListProductRemoved } = req.query;
    const result = await ProductService.getAllProductsAdmin(
      Number(limit) || 10,
      Number(page) || 0,
      filter,
      isListProductRemoved,
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// GET BY ID — Chi tiết sản phẩm
// GET /api/product/:id
// ================================================================
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductService.getProductById(id);
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// UPDATE — Cập nhật thông tin sản phẩm
// PUT /api/product/:id
// Body: các trường cần update
// ================================================================
exports.updateProduct = async (req, res) => {
  try {
    const updated = await ProductService.updateProduct(req.params.id, req.body);
    res
      .status(200)
      .json({ message: "Cập nhật sản phẩm thành công", data: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ================================================================
// SOFT DELETE — Ẩn sản phẩm (không xóa khỏi DB)
// DELETE /api/product/:id
// ================================================================
exports.deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/))
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });

    const deleted = await ProductService.deleteProduct(id);
    if (!deleted)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    res.json({ message: "Đã ẩn sản phẩm thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// RESTORE — Khôi phục sản phẩm đã ẩn
// PATCH /api/product/:id/restore
// ================================================================
exports.restoreProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const restored = await ProductService.restoreProductById(id);
    if (!restored)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    res.json({ message: "Khôi phục sản phẩm thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// HARD DELETE — Xóa vĩnh viễn (chỉ admin cấp cao)
// DELETE /api/product/:id/permanent
// ================================================================
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/))
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });

    const deleted = await ProductService.deleteProduct(id);
    if (!deleted)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    res.json({ message: "Đã xóa sản phẩm vĩnh viễn" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// UPLOAD IMAGE — Upload ảnh chính cho sản phẩm
// POST /api/product/:id/upload-image
// Form-data: file
// ================================================================
exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/))
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });

    if (!req.file)
      return res.status(400).json({ message: "Vui lòng chọn file ảnh" });

    const result = await ProductService.uploadImage(id, req.file);
    return res.json({ message: "Upload ảnh thành công", data: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// GET STOCK — Kiểm tra tồn kho (dùng khi thêm vào giỏ hàng)
// POST /api/product/get-stock
// Body: [{ productId, sku? }, ...]
//   - Có sku  → lấy tồn kho variant (size/màu cụ thể)
//   - Không sku → lấy tồn kho tổng sản phẩm
// ================================================================
exports.getStock = async (req, res) => {
  try {
    const data = req.body || [];

    if (!Array.isArray(data) || data.length === 0)
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });

    const results = await Promise.all(
      data.map(async (item) => {
        const { productId, sku } = item;

        if (sku) {
          // Kiểm tra tồn kho theo variant (VD: Nike Air Max size 42 màu đen)
          const product = await Product.findOne({
            _id: productId,
            "variants.sku": sku,
          });

          if (!product)
            return { productId, sku, countInStock: 0, available: false };

          const variant = product.variants.find((v) => v.sku === sku);
          return {
            productId,
            sku,
            size: variant?.attributes?.Size || null,
            color: variant?.attributes?.Color || null,
            countInStock: variant?.stock ?? 0,
            available: (variant?.stock ?? 0) > 0,
          };
        } else {
          // Kiểm tra tồn kho tổng (sản phẩm không có variant)
          const product = await Product.findById(productId);
          const available = product?.stock ?? product?.countInStock ?? 0;
          return {
            productId,
            countInStock: available,
            available: available > 0,
          };
        }
      }),
    );

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// RELATION PRODUCTS — Sản phẩm liên quan (cùng brand hoặc category)
// POST /api/product/relation
// Body: { categoryId, brandId, id }  ← id = sản phẩm hiện tại (loại trừ)
// ================================================================
exports.relationProduct = async (req, res) => {
  try {
    const { categoryId, brandId, id } = req.body;
    const products = await ProductService.relationProduct(
      categoryId,
      brandId,
      id,
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// GET BY CATEGORY — Lấy giày theo danh mục
// GET /api/product/category/:categoryId
// VD: Giày chạy bộ, Giày bóng rổ, Giày lifestyle...
// ================================================================
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const products = await ProductService.getProductsByCategory(categoryId);
    successResponse({
      res,
      message: "Lấy sản phẩm theo danh mục thành công",
      data: products,
    });
  } catch (err) {
    errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// GET BY BRAND — Lấy giày theo thương hiệu
// GET /api/product/brand/:brandId
// VD: Nike, Adidas, Jordan, Puma, New Balance...
// ================================================================
exports.getByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const products = await Product.find({
      brandId,
      isDeleted: { $ne: true },
    })
      .populate("brandId", "name logo")
      .populate("categoryId", "name");

    successResponse({ res, data: products });
  } catch (err) {
    errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// GET BY BRAND + CATEGORY — Filter kết hợp
// GET /api/product/filter?brandId=xxx&categoryId=yyy&gender=nam
// ================================================================
exports.getByBrandAndCategory = async (req, res) => {
  try {
    const { brandId, categoryId, gender, minPrice, maxPrice } = req.query;

    const filter = { isDeleted: { $ne: true } };
    if (brandId) filter.brandId = brandId;
    if (categoryId) filter.categoryId = categoryId;
    if (gender) filter.gender = gender;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(filter)
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    successResponse({ res, data: products });
  } catch (err) {
    errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// FEATURED — Sản phẩm nổi bật (hiển thị trên trang chủ)
// GET /api/product/featured
// ================================================================
exports.getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const products = await Product.find({
      isFeatured: true,
      isDeleted: { $ne: true },
    })
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    successResponse({ res, data: products });
  } catch (err) {
    errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// NEW ARRIVALS — Hàng mới về (30 ngày gần nhất)
// GET /api/product/new-arrivals
// ================================================================
exports.getNewArrivals = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const products = await Product.find({
      createdAt: { $gte: thirtyDaysAgo },
      isDeleted: { $ne: true },
    })
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    successResponse({ res, data: products });
  } catch (err) {
    errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// BEST SELLERS — Bán chạy nhất (dựa vào soldCount)
// GET /api/product/best-sellers
// ================================================================
exports.getBestSellers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const products = await Product.find({ isDeleted: { $ne: true } })
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .limit(Number(limit))
      .sort({ soldCount: -1 });

    successResponse({ res, data: products });
  } catch (err) {
    errorResponse({ res, message: err.message, statusCode: 500 });
  }
};

// ================================================================
// SEARCH — Tìm kiếm giày theo từ khóa
// GET /api/product/search?keyword=air+max&limit=12&page=0
// ================================================================
exports.searchProducts = async (req, res) => {
  try {
    const { keyword, limit = 12, page = 0 } = req.query;

    if (!keyword?.trim())
      return res
        .status(400)
        .json({ message: "Vui lòng nhập từ khóa tìm kiếm" });

    const regex = new RegExp(keyword.trim(), "i");
    const filter = {
      isDeleted: { $ne: true },
      $or: [{ name: { $regex: regex } }, { description: { $regex: regex } }],
    };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name logo")
        .populate("categoryId", "name")
        .skip(Number(page) * Number(limit))
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    res.json({
      data: products,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
      keyword,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// TOGGLE FEATURED — Bật/tắt sản phẩm nổi bật (admin)
// PATCH /api/product/:id/toggle-featured
// ================================================================
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    product.isFeatured = !product.isFeatured;
    await product.save();

    res.json({
      message: `Sản phẩm đã được ${product.isFeatured ? "đánh dấu" : "bỏ đánh dấu"} nổi bật`,
      isFeatured: product.isFeatured,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================================================
// TOGGLE VISIBLE — Ẩn / hiện sản phẩm trên store (admin)
// PATCH /api/product/:id/toggle-visible
// ================================================================
exports.toggleVisible = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    product.isVisible = !product.isVisible;
    await product.save();

    res.json({
      message: `Sản phẩm đã được ${product.isVisible ? "hiển thị" : "ẩn"} trên cửa hàng`,
      isVisible: product.isVisible,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
