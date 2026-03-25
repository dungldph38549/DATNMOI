// ================================================================
// middlewares/auth.js — SneakerHouse
// ================================================================
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel"); // khớp với models/ (plural)

// ================================================================
// HELPERS (dùng nội bộ)
// ================================================================

/**
 * Lấy token từ Authorization header hoặc cookie
 */
const extractToken = (req) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.split(" ")[1];
  if (req.cookies?.access_token) return req.cookies.access_token;
  return null;
};

/**
 * Giải mã token → trả về object user chuẩn hoá
 * Nếu payload có id → truy vấn DB lấy thông tin mới nhất
 */
const decodeToken = async (token) => {
  const secret = process.env.ACCESS_TOKEN || process.env.ACCESS_TOKEN_SECRET || "access_secret";
  const decoded = jwt.verify(token, secret);
  const { payload } = decoded;

  if (payload?.id) {
    const user = await User.findById(payload.id).select("-password");
    if (!user) throw new Error("USER_NOT_FOUND");

    // UserModel dùng: role + isActive (soft ban qua isActive)
    const isBanned = user.isActive === false || user.isBanned === true;
    // userModel dùng `role` ("customer" | "staff" | "manager" | "admin")
    // nhưng có thể DB cũ chỉ có `isAdmin` -> ưu tiên isAdmin để tránh bị chặn 403 sai.
    const systemRole = user.role; // may be undefined for legacy docs
    const normalizedRole =
      user.isAdmin === true || systemRole === "admin"
        ? "admin"
        : ["staff", "manager"].includes(systemRole)
          ? "staff"
          : "user";

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      isAdmin: normalizedRole === "admin",
      isStaff: normalizedRole === "staff",
      isBanned,
      role: normalizedRole,
    };
  }

  // Token lightweight (không có id) → dùng payload trực tiếp
  return {
    ...payload,
    isAdmin: payload.isAdmin || false,
    isStaff: payload.isStaff || false,
    isBanned: payload.isBanned || false,
    role: payload.isAdmin ? "admin" : payload.isStaff ? "staff" : "user",
  };
};

/**
 * Gửi lỗi xác thực nhất quán
 */
const authError = (res, status, message) =>
  res.status(status).json({ message, status: "Err" });

/**
 * Xử lý lỗi JWT tập trung — dùng trong mọi middleware
 */
const handleAuthError = (res, err, label) => {
  if (err.message === "USER_NOT_FOUND")
    return authError(res, 401, "Tài khoản không tồn tại");
  if (err.name === "TokenExpiredError")
    return authError(
      res,
      401,
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
    );
  if (err.name === "JsonWebTokenError")
    return authError(res, 403, "Token không hợp lệ");
  console.error(`[${label}]`, err.message);
  return authError(res, 500, "Lỗi xác thực");
};

/**
 * Core: lấy token → decode → kiểm tra banned → gắn req.user
 * Trả về user nếu thành công, ném lỗi nếu thất bại
 */
const resolveUser = async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    authError(res, 401, "Vui lòng đăng nhập để tiếp tục");
    return null;
  }

  const user = await decodeToken(token);

  if (user.isBanned) {
    authError(res, 403, "Tài khoản của bạn đã bị khóa");
    return null;
  }

  req.user = user;
  return user;
};

// ================================================================
// authMiddleware — Yêu cầu đăng nhập (user / staff / admin)
// Dùng cho: giỏ hàng, đặt hàng, đánh giá, lịch sử mua hàng
// ================================================================
const authMiddleware = async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;
    next();
  } catch (err) {
    handleAuthError(res, err, "authMiddleware");
  }
};

// ================================================================
// authAdminMiddleware — Chỉ dành cho Admin
// Dùng cho: xoá cứng dữ liệu, phân quyền, cấu hình hệ thống
// ================================================================
const authAdminMiddleware = async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    if (!user.isAdmin)
      return authError(res, 403, "Bạn không có quyền thực hiện thao tác này");

    next();
  } catch (err) {
    handleAuthError(res, err, "authAdminMiddleware");
  }
};

// ================================================================
// authStaffMiddleware — Admin hoặc Staff
// Dùng cho: tạo/sửa sản phẩm, danh mục, thương hiệu,
//           xử lý đơn hàng, cập nhật trạng thái giao hàng
// ================================================================
const authStaffMiddleware = async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    if (!user.isAdmin && !user.isStaff)
      return authError(res, 403, "Bạn không có quyền thực hiện thao tác này");

    next();
  } catch (err) {
    handleAuthError(res, err, "authStaffMiddleware");
  }
};

// ================================================================
// optionalAuthMiddleware — Không bắt buộc đăng nhập
// Nếu token hợp lệ → gắn req.user
// Nếu không có / hết hạn / lỗi → req.user = null, vẫn next()
// Dùng cho: trang sản phẩm (nút yêu thích), trang chủ
// ================================================================
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    req.user = await decodeToken(token);
  } catch {
    req.user = null;
  }
  next();
};

// ================================================================
// isOwnerOrAdmin — Chủ resource hoặc Admin mới được phép
// Dùng cho: sửa/xoá đánh giá, xem đơn hàng cá nhân
//
// Kiểm tra theo thứ tự:
//   1. Admin  → bỏ qua, next() luôn
//   2. :userId trong params → phải khớp req.user.id
//   3. :id trong params     → phải khớp req.user.id
//   4. :orderId trong params → truy vấn DB kiểm tra chủ đơn
// ================================================================
const isOwnerOrAdmin = async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    // Admin bỏ qua mọi kiểm tra ownership
    if (user.isAdmin) return next();

    const currentId = user.id?.toString();
    const { id, userId, orderId } = req.params;

    if (userId && userId !== currentId)
      return authError(res, 403, "Bạn không có quyền truy cập tài nguyên này");

    if (id && id !== currentId)
      return authError(res, 403, "Bạn không có quyền truy cập tài nguyên này");

    if (orderId) {
      const Order = require("../models/OrderModel");
      const order = await Order.findById(orderId).select("userId");
      if (!order) return authError(res, 404, "Không tìm thấy đơn hàng");
      if (order.userId?.toString() !== currentId)
        return authError(res, 403, "Bạn không phải chủ đơn hàng này");
    }

    next();
  } catch (err) {
    handleAuthError(res, err, "isOwnerOrAdmin");
  }
};

// ================================================================
// Export
// ================================================================
module.exports = {
  // Named exports — dùng trực tiếp trong router
  authMiddleware, // user đã đăng nhập
  authAdminMiddleware, // chỉ admin
  authStaffMiddleware, // admin hoặc staff
  optionalAuthMiddleware, // không bắt buộc
  isOwnerOrAdmin, // chủ resource hoặc admin

  // Aliases — giữ tương thích với code cũ nếu có
  protect: authMiddleware,
  optionalAuth: optionalAuthMiddleware,
  authOwnerOrAdminMiddleware: isOwnerOrAdmin,

  /**
   * restrictTo(...roles) — middleware factory theo role string
   * @example router.get("/", restrictTo("admin", "staff"), handler)
   */
  restrictTo:
    (...roles) =>
    async (req, res, next) => {
      try {
        const user = await resolveUser(req, res);
        if (!user) return;
        if (!roles.includes(user.role))
          return authError(
            res,
            403,
            "Bạn không có quyền thực hiện thao tác này",
          );
        next();
      } catch (err) {
        handleAuthError(res, err, "restrictTo");
      }
    },
};
