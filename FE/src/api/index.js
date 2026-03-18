import axiosInstance from "./axiosConfig";

// ================== Upload ==================
// export const uploadImage = async (payload) => {
//   const res = await axiosInstance.post("/upload", payload, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   return res.data;
// };

// export const uploadImages = async (payload) => {
//   const res = await axiosInstance.post("/uploads/multiple", payload, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   return res.data;
// };

// ================== User ==================

export const loginUser = async (payload) => {
  const res = await axiosInstance.post("/user/login", payload);
  return res.data;
};

export const registerUser = async (payload) => {
  const res = await axiosInstance.post("/user/register", payload);
  return res.data;
};

export const getUserById = async (id) => {
  const res = await axiosInstance.get(`/user/${id}`);
  return res.data;
};

export const updateUserById = async (id, payload) => {
  // Backend admin update: PUT /api/user/admin/:id
  const res = await axiosInstance.put(`/user/admin/${id}`, payload);
  return res.data;
};

export const updateCustomerById = async (payload) => {
  const res = await axiosInstance.put("/user/update", payload);
  return res.data;
};

export const getAllUser = async (page, limit) => {
  // Backend staff list (có phân trang): GET /api/user/all?page=&limit=
  const res = await axiosInstance.get(`/user/all?page=${page}&limit=${limit}`);
  return res.data;
};
// ================== Product API ==================
// Khớp với ProductController.js — SneakerHouse

// ── KHÁCH HÀNG ────────────────────────────────────────────────

/**
 * Lấy danh sách sản phẩm (có filter + phân trang)
 * POST /api/product/get-products
 */
export const fetchProducts = async (payload) => {
  const res = await axiosInstance.post("/product/get-products", payload);
  return res.data;
};

/**
 * Lấy sản phẩm nổi bật (trang chủ)
 * GET /api/product/featured?limit=8
 */
export const getFeaturedProducts = async (limit = 8) => {
  const res = await axiosInstance.get(`/product/featured?limit=${limit}`);
  return res.data;
};

/**
 * Lấy hàng mới về (30 ngày gần nhất)
 * GET /api/product/new-arrivals?limit=10
 */
export const getNewArrivals = async (limit = 10) => {
  const res = await axiosInstance.get(`/product/new-arrivals?limit=${limit}`);
  return res.data;
};

/**
 * Lấy sản phẩm bán chạy nhất
 * GET /api/product/best-sellers?limit=10
 */
export const getBestSellers = async (limit = 10) => {
  const res = await axiosInstance.get(`/product/best-sellers?limit=${limit}`);
  return res.data;
};

/**
 * Tìm kiếm sản phẩm theo từ khóa
 * GET /api/product/search?keyword=air+max&limit=12&page=0
 */
export const searchProducts = async ({ keyword, limit = 12, page = 0 }) => {
  const res = await axiosInstance.get(
    `/product/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}&page=${page}`,
  );
  return res.data;
};

/**
 * Lấy chi tiết sản phẩm theo ID
 * GET /api/product/:id
 */
export const getProductById = async (id) => {
  const res = await axiosInstance.get(`/product/${id}`);
  return res.data;
};

/**
 * Lấy sản phẩm theo danh mục
 * GET /api/product/category/:categoryId
 */
export const getProductsByCategory = async (categoryId) => {
  const res = await axiosInstance.get(`/product/category/${categoryId}`);
  return res.data;
};

/**
 * Lấy sản phẩm theo thương hiệu
 * GET /api/product/brand/:brandId
 */
export const getProductsByBrand = async (brandId) => {
  const res = await axiosInstance.get(`/product/brand/${brandId}`);
  return res.data;
};

/**
 * Lọc sản phẩm theo brand + category + gender + giá
 * GET /api/product/filter?brandId=&categoryId=&gender=&minPrice=&maxPrice=
 */
export const filterProducts = async ({
  brandId,
  categoryId,
  gender,
  minPrice,
  maxPrice,
} = {}) => {
  const params = new URLSearchParams();
  if (brandId) params.append("brandId", brandId);
  if (categoryId) params.append("categoryId", categoryId);
  if (gender) params.append("gender", gender);
  if (minPrice) params.append("minPrice", minPrice);
  if (maxPrice) params.append("maxPrice", maxPrice);

  const res = await axiosInstance.get(`/product/filter?${params.toString()}`);
  return res.data;
};

/**
 * Sản phẩm liên quan (cùng brand hoặc category)
 * POST /api/product/relation
 */
export const relationProduct = async (brandId, categoryId, id) => {
  const res = await axiosInstance.post("/product/relation", {
    brandId,
    categoryId,
    id,
  });
  return res.data;
};

/**
 * Kiểm tra tồn kho (gọi trước khi thêm vào giỏ hàng)
 * POST /api/product/get-stock
 */
export const getStocks = async (payload) => {
  const res = await axiosInstance.post("/product/get-stock", payload);
  return res.data;
};

// ── ADMIN ─────────────────────────────────────────────────────

/**
 * Lấy tất cả sản phẩm (admin — bao gồm đã ẩn)
 * GET /api/product/admin/get-all
 */
export const getAllProducts = async ({
  page = 0,
  limit = 10,
  isListProductRemoved = false,
  filter = {},
} = {}) => {
  const res = await axiosInstance.get(
    `/product/admin/get-all?page=${page}&limit=${limit}&isListProductRemoved=${isListProductRemoved}&filter=${encodeURIComponent(JSON.stringify(filter))}`,
  );
  return res.data;
};

export const createProduct = async (payload) => {
  const res = await axiosInstance.post("/product/create", { payload });
  return res.data;
};

export const updateProduct = async ({ id, payload }) => {
  const res = await axiosInstance.put(`/product/${id}`, payload);
  return res.data;
};

export const deleteProductById = async ({ id }) => {
  const res = await axiosInstance.delete(`/product/${id}`);
  return res.data;
};

export const restoreProductById = async ({ id }) => {
  const res = await axiosInstance.patch(`/product/${id}/restore`);
  return res.data;
};

export const toggleFeatured = async ({ id }) => {
  const res = await axiosInstance.patch(`/product/${id}/toggle-featured`);
  return res.data;
};

export const toggleVisible = async ({ id }) => {
  const res = await axiosInstance.patch(`/product/${id}/toggle-visible`);
  return res.data;
};

// ── UPLOAD ────────────────────────────────────────────────────

export const uploadImage = async (payload) => {
  const res = await axiosInstance.post("/upload", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const uploadImages = async (payload) => {
  const res = await axiosInstance.post("/uploads/multiple", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ================== Brand API ==================

export const getAllBrands = async (status = "all") => {
  const res = await axiosInstance.get(`/brand?status=${status}`);
  return res.data;
};

export const createBrand = async (payload) => {
  const res = await axiosInstance.post("/brand/admin/create", payload);
  return res.data;
};

export const updateBrand = async (payload) => {
  const res = await axiosInstance.put("/brand/admin/update", payload);
  return res.data;
};

export const deleteBrand = async ({ ids }) => {
  const res = await axiosInstance.delete("/brand/admin/delete", {
    data: { ids },
  });
  return res.data;
};

export const getBrandById = async (id) => {
  const res = await axiosInstance.get(`/brand/admin/detail/${id}`);
  return res.data;
};

// ================== Category API ==================

/**
 * GET /category?status=active|inactive|all
 */
export const getAllCategories = async (status = "active") => {
  const res = await axiosInstance.get(`/category?status=${status}`);
  return res.data;
};

/**
 * GET /category/:id
 */
export const getCategoryById = async (id) => {
  const res = await axiosInstance.get(`/category/${id}`);
  return res.data;
};

/**
 * POST /category/admin/create
 */
export const createCategory = async (payload) => {
  const res = await axiosInstance.post("/category/admin/create", payload);
  return res.data;
};

/**
 * PUT /category/admin/update
 * payload phải có { id, ...fields }
 */
export const updateCategory = async (payload) => {
  const res = await axiosInstance.put("/category/admin/update", payload);
  return res.data;
};

/**
 * Soft-delete: chuyển status → "inactive"
 */
export const softDeleteCategory = async (id) => {
  return updateCategory({ id, status: "inactive" });
};

/**
 * DELETE /category/admin/delete
 */
export const deleteCategories = async (ids) => {
  const res = await axiosInstance.delete("/category/admin/delete", {
    data: { ids },
  });
  return res.data;
};

// ================== Inventory API (Admin) ==================

const inventoryData = (res) => res?.data?.data ?? res?.data;

/** GET /api/inventory/admin/list?status=&q= */
export const getInventoryList = async (params = {}) => {
  const res = await axiosInstance.get("/inventory/admin/list", { params });
  return inventoryData(res);
};

/** GET /api/inventory/:id */
export const getInventoryById = async (id) => {
  const res = await axiosInstance.get(`/inventory/${id}`);
  return inventoryData(res);
};

/** GET /api/inventory/:id/logs?page=&limit=&type= */
export const getInventoryLogs = async (id, params = {}) => {
  const res = await axiosInstance.get(`/inventory/${id}/logs`, { params });
  return inventoryData(res);
};

/** POST /api/inventory/:id/import — body: { qty, warehouseId, note } */
export const importInventoryStock = async (id, body) => {
  const res = await axiosInstance.post(`/inventory/${id}/import`, body);
  return inventoryData(res);
};

/** PATCH /api/inventory/:id/adjust — body: { newQty, warehouseId?, note } */
export const adjustInventoryStock = async (id, body) => {
  const res = await axiosInstance.patch(`/inventory/${id}/adjust`, body);
  return inventoryData(res);
};

/** POST /api/inventory/:id/transfer — body: { qty, fromWarehouseId, toWarehouseId, note } */
export const transferInventoryStock = async (id, body) => {
  const res = await axiosInstance.post(`/inventory/${id}/transfer`, body);
  return inventoryData(res);
};

// ================== Warehouse API ==================

/** GET /api/warehouses */
export const getWarehouses = async (params = {}) => {
  const res = await axiosInstance.get("/warehouses", { params });
  return res?.data?.data ?? res?.data ?? [];
};
