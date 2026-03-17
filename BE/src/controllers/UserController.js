// ================================================================
// controllers/UserController.js — SneakerHouse
// ================================================================
const UserService = require("../services/UserService"); // ← "services" số nhiều
const { successResponse, errorResponse } = require("../utils/response");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helper: trả lỗi nhất quán ─────────────────────────────────
const handleError = (res, err) => {
  const status = err.status || 500;
  const message = err.message || "Lỗi máy chủ, vui lòng thử lại";
  console.error("[UserController]", message);
  return errorResponse({ res, message, statusCode: status });
};

// ================================================================
// AUTH
// ================================================================

/**
 * POST /user/register
 * Body: { name, email, password, confirmPassword, phone }
 */

exports.createUser = async (req, res) => {
  try {
    // 1. Không yêu cầu lấy confirmPassword từ req.body nữa
    const { name, email, password, phone } = req.body;

    // 2. Chỉ kiểm tra 4 trường chính
    if (!name || !email || !password || !phone)
      return errorResponse({
        res,
        message: "Vui lòng điền đầy đủ thông tin",
        statusCode: 422,
      });

    // 3. Kiểm tra định dạng email
    if (!EMAIL_REGEX.test(email))
      return errorResponse({
        res,
        message: "Email không hợp lệ",
        statusCode: 422,
      });

    // Đã xóa phần kiểm tra password !== confirmPassword ở Backend vì Frontend đã làm việc này

    // 4. Gọi Service để tạo User
    const result = await UserService.createUser(req.body);
    return successResponse({ res, data: result, statusCode: 201 });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * POST /user/login
 * Body: { email, password }
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || !EMAIL_REGEX.test(email))
      return errorResponse({
        res,
        message: "Vui lòng điền đầy đủ thông tin",
        statusCode: 422,
      });

    const result = await UserService.loginUser({ email, password });
    return successResponse({ res, data: result });
  } catch (err) {
    handleError(res, err);
  }
};

// ================================================================
// USER — tự quản lý thông tin cá nhân
// ================================================================

/**
 * GET /user/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    return successResponse({ res, data: user });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * PUT /user/update
 * Body: { id, name?, email?, phone?, address?, password?, avatar? }
 * Dùng cho khách hàng tự cập nhật profile
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id, name, email, phone, address, password, avatar } = req.body;

    if (!id)
      return errorResponse({
        res,
        message: "Thiếu ID người dùng",
        statusCode: 422,
      });

    // Chỉ cập nhật field nào được gửi lên
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (password) updateData.password = password;
    if (avatar) updateData.avatar = avatar;

    const user = await UserService.updateUser(id, updateData);
    return successResponse({ res, data: user });
  } catch (err) {
    handleError(res, err);
  }
};

// ================================================================
// ADMIN — quản lý tất cả users
// ================================================================

/**
 * GET /user/list?page=0&limit=10
 * Dành cho admin: phân trang + filter
 */
exports.listUser = async (req, res) => {
  try {
    const { page = 0, limit = 10 } = req.query;
    const result = await UserService.listUser(Number(page), Number(limit));
    return successResponse({ res, data: result });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * GET /user/admin/all
 * Lấy toàn bộ user không phân trang (dùng cho dropdown, export...)
 */
exports.getAllUser = async (req, res) => {
  try {
    const users = await UserService.getAllUser();
    return successResponse({ res, data: users });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * PUT /user/update/:id
 * Admin cập nhật thông tin user bất kỳ (bao gồm isAdmin, isBanned...)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return errorResponse({
        res,
        message: "Thiếu ID người dùng",
        statusCode: 422,
      });

    const user = await UserService.updateUser(id, req.body);
    return successResponse({ res, data: user });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * DELETE /user/admin/:id  — soft delete (đánh dấu đã xóa)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return errorResponse({
        res,
        message: "Thiếu ID người dùng",
        statusCode: 422,
      });

    const result = await UserService.deleteUser(id);
    return successResponse({ res, data: result });
  } catch (err) {
    handleError(res, err);
  }
};
