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

export const addToCartAPI = async (payload) => {
  // Back-end: POST /api/cart/:userId/items
  // payload: { userId, productId, qty, sku?, size? }
  const { userId, productId, qty, sku, size } = payload || {};
  if (!userId || !productId) throw new Error("Missing userId or productId");
  const res = await axiosInstance.post(`/cart/${userId}/items`, {
    productId,
    qty,
    sku: sku ?? null,
    size: size ?? null,
  });
  return res.data;
};

export const getCart = async (userId) => {
  const res = await axiosInstance.get(`/cart/${userId}`);
  return res.data;
};

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
  // Backend staff list (có phân trang): GET /api/user/list?page=&limit=

  // Admin: danh sách user có phân trang
  // Backend: GET /api/user/list?page=&limit=
  const res = await axiosInstance.get(`/user/list?page=${page}&limit=${limit}`);

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

export const getProductSaleReport = async ({ startDate, endDate } = {}) => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const query = params.toString();
  const res = await axiosInstance.get(`/product/admin/sale-report${query ? `?${query}` : ""}`);
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

/** POST /api/inventory — create inventory by SKU
 * Body: { productId, variantId?, sku, lowStockThreshold? }
 */
export const createInventory = async (payload) => {
  const res = await axiosInstance.post("/inventory", payload);
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

// ================== Order API ==================

export const createOrder = async (payload) => {
  const res = await axiosInstance.post("/order", payload);
  return res.data;
};

export const getOrdersByUser = async (userId, page = 1, limit = 10) => {
  const res = await axiosInstance.get(
    `/order/user?userId=${userId}&page=${page}&limit=${limit}`,
  );
  return res.data;
};

export const getOrdersByUserOrGuest = async ({
  userId,
  guestId,
  page = 1,
  limit = 10,
} = {}) => {
  const params = { page, limit };
  if (userId) params.userId = userId;
  if (guestId) params.guestId = guestId;
  const res = await axiosInstance.get(`/order/user`, { params });
  return res.data;
};

export const getOrderById = async (id) => {
  const res = await axiosInstance.get(`/order/${id}`);
  return res.data;
};

export const updateOrderStatus = async (id, body) => {
  const endpoints = [`/order/${id}`, `/order/admin/${id}`];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const res = await axiosInstance.put(endpoint, body);
      return res.data;
    } catch (err) {
      lastError = err;
      // Nếu 404 thì thử endpoint tiếp theo, các lỗi khác ném luôn.
      if (err?.response?.status !== 404) break;
    }
  }
  throw lastError;
};

export const confirmDelivery = async (id) => {
  const res = await axiosInstance.post(`/order/comfirmDelivery/${id}`);
  return res.data;
};

export const cancelOrderByUser = async (id) => {
  const res = await axiosInstance.patch(`/order/${id}`, { status: "canceled" });
  return res.data;
};

export const createVnpayUrl = async (orderId, returnUrl, cancelUrl) => {
  const res = await axiosInstance.post(`/order/${orderId}/create-vnpay-url`, {
    returnUrl,
    cancelUrl,
  });
  return res.data;
};

export const returnOrderRequest = async (id, reason) => {
  const res = await axiosInstance.post(`/order/${id}/return-request`, {
    reason,
  });
  return res.data;
};

export const acceptReturn = async (id, note) => {
  const res = await axiosInstance.put(`/order/${id}/accept-return`, { note });
  return res.data;
};

export const rejectReturn = async (id, note) => {
  const res = await axiosInstance.put(`/order/${id}/reject-return`, { note });
  return res.data;
};

// Admin: lấy tất cả đơn hàng
export const getAllOrders = async (page = 0, limit = 10) => {
  const res = await axiosInstance.get(`/order?page=${page}&limit=${limit}`);
  return res.data;
};

// ================== Voucher API ==================

export const getAllVouchers = async () => {
  const res = await axiosInstance.get("/voucher");
  return res.data;
};

export const getVoucherDetail = async (id) => {
  const res = await axiosInstance.get(`/voucher/${id}`);
  return res.data;
};

export const createVoucher = async (payload) => {
  const res = await axiosInstance.post("/voucher/create", payload);
  return res.data;
};

export const updateVoucher = async (id, payload) => {
  const res = await axiosInstance.put(`/voucher/${id}`, payload);
  return res.data;
};

export const deleteVoucher = async (id) => {
  const res = await axiosInstance.delete(`/voucher/${id}`);
  return res.data;
};

export const getVoucherByCode = async (code) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return null;
  try {
    const res = await axiosInstance.get(
      `/voucher/code/${encodeURIComponent(normalizedCode)}`,
    );
    return res?.data?.data || res?.data || null;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

// ================== Size API ==================

export const getAllSizes = async () => {
  const res = await axiosInstance.get("/size/get-all");
  return res.data;
};

export const createSize = async (payload) => {
  const res = await axiosInstance.post("/size/create", payload);
  return res.data;
};

export const updateSize = async (id, payload) => {
  const res = await axiosInstance.put(`/size/update/${id}`, payload);
  return res.data;
};

export const deleteSize = async (id) => {
  const res = await axiosInstance.delete(`/size/delete/${id}`);
  return res.data;
};

// ================== Chat API ==================

// GET /api/chat/history?customerId=...
// Backend chưa chắc đã triển khai, FE sẽ handle lỗi nếu endpoint không tồn tại.
export const getChatHistory = async ({ customerId } = {}) => {
  if (!customerId) return [];
  const res = await axiosInstance.get("/chat/history", {
    params: { customerId },
  });
  // Tùy backend có bọc {data: ...} hay không
  return res?.data?.data ?? res?.data ?? [];
};

// GET /api/chat/inbox (admin only)
export const getChatInbox = async () => {
  const res = await axiosInstance.get("/chat/inbox");
  return res?.data?.data ?? res?.data ?? [];
};

// ================== Review API (Customer) ==================
/**
 * GET /api/reviews
 * Query params: productId, page, limit, rating, verified, sort
 */
export const getProductReviews = async ({
  productId,
  page = 1,
  limit = 10,
  rating,
  verified,
  sort = "newest",
} = {}) => {
  const res = await axiosInstance.get("/reviews", {
    params: {
      productId,
      page,
      limit,
      rating,
      verified,
      sort,
    },
  });
  return res.data;
};

/**
 * GET /api/reviews/stats/:productId
 */
export const getReviewStatsByProduct = async (productId) => {
  const res = await axiosInstance.get(`/reviews/stats/${productId}`);
  return res.data;
};

/**
 * POST /api/reviews
 * Body: { productId, rating, title, content, images, orderId? }
 */
export const createReview = async (payload) => {
  const res = await axiosInstance.post("/reviews", payload);
  return res.data;
};

export const getMyReviewByProduct = async (productId) => {
  const res = await axiosInstance.get("/reviews/mine", {
    params: { productId },
  });
  return res?.data?.data ?? null;
};

// ================== Review API (Admin) ==================
export const getAdminReviews = async ({
  status = "pending",
  productId,
} = {}) => {
  const res = await axiosInstance.get("/admin/reviews", {
    params: { status, productId },
  });
  return res.data;
};

export const approveAdminReview = async (id) => {
  const res = await axiosInstance.patch(`/admin/reviews/${id}/approve`);
  return res.data;
};

export const rejectAdminReview = async (id, reason = "") => {
  const res = await axiosInstance.patch(`/admin/reviews/${id}/reject`, {
    reason,
  });
  return res.data;
};
