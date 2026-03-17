// ================================================================
// services/UserService.js — SneakerHouse
// ================================================================
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/UserModel");

// ── Helper: Validate ObjectId ──────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── Helper: Tạo access token + refresh token ──────────────────
const generateTokens = (userId) => {
  const payload = { id: userId };

  // Đã sửa "acess_token" thành "access_token" cho đúng chuẩn
  const access_token = jwt.sign({ payload }, process.env.ACCESS_TOKEN, {
    expiresIn: "7d",
  });

  const refresh_token = jwt.sign(
    { payload },
    process.env.REFRESH_TOKEN || process.env.ACCESS_TOKEN,
    { expiresIn: "30d" },
  );

  return { access_token, refresh_token };
};

// ── Helper: Loại bỏ các field nhạy cảm trước khi trả về ───────
const sanitize = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.emailVerificationToken;
  return obj;
};

// ================================================================
// AUTH (ĐĂNG KÝ & ĐĂNG NHẬP)
// ================================================================

/**
 * Đăng ký tài khoản mới (Khách hàng)
 */
exports.createUser = async (payload) => {
  const { name, email, password, phone } = payload;

  // 1. Kiểm tra xem email đã tồn tại trong hệ thống chưa
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { status: 409, message: "Email này đã được sử dụng!" };
  }

  // 2. Tạo User mới (Dùng new User + .save() để kích hoạt bcrypt)
  const newUser = new User({
    name,
    email,
    password,
    phone,
  });

  const savedUser = await newUser.save();

  // 3. Tạo token cho user mới
  const tokens = generateTokens(savedUser._id);

  // 4. Lưu refresh_token vào lại DB để quản lý đăng nhập
  savedUser.refresh_token = tokens.refresh_token;
  await savedUser.save();

  // 5. Trả về data (đã xoá pass) và kèm token
  return {
    data: sanitize(savedUser),
    access_token: tokens.access_token,
  };
};

/**
 * Đăng nhập tài khoản
 */
exports.loginUser = async (payload) => {
  const { email, password } = payload;

  // 1. Tìm user theo email
  const user = await User.findOne({ email, deletedAt: null });
  if (!user) {
    throw { status: 404, message: "Tài khoản không tồn tại!" };
  }

  // 2. Kiểm tra tài khoản có bị khoá không
  if (user.isBanned) {
    throw { status: 403, message: "Tài khoản của bạn đã bị khoá!" };
  }

  // 3. Kiểm tra mật khẩu (Sử dụng hàm comparePassword nếu có trong model hoặc dùng bcrypt.compare)
  let isMatch = false;
  if (user.comparePassword) {
    isMatch = await user.comparePassword(password);
  } else {
    isMatch = await bcrypt.compare(password, user.password);
  }

  if (!isMatch) {
    throw { status: 401, message: "Mật khẩu không chính xác!" };
  }

  // 4. Tạo token mới
  const tokens = generateTokens(user._id);

  // 5. Cập nhật lại refresh_token và lastLogin
  user.refresh_token = tokens.refresh_token;
  user.lastLogin = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  await user.save();

  // 6. Trả về kết quả
  return {
    data: sanitize(user),
    access_token: tokens.access_token,
  };
};

// ================================================================
// QUẢN LÝ NGƯỜI DÙNG (ADMIN / USER)
// ================================================================

/**
 * Khách hàng tự cập nhật profile cá nhân
 */
exports.updateCustomer = async (id, payload) => {
  if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };

  const { name, phone, address, avatar } = payload;

  // Không cho phép user tự update quyền admin, role hay email qua API này
  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (address) updateData.address = address;
  if (avatar) updateData.avatar = avatar;

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  });
  if (!updatedUser) throw { status: 404, message: "Không tìm thấy người dùng" };

  return sanitize(updatedUser);
};

/**
 * Admin cập nhật thông tin User (kể cả phân quyền)
 */
exports.updateUser = async (id, payload) => {
  if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };

  // Loại bỏ password ra khỏi payload (nếu muốn đổi pass phải có API riêng)
  const { password, ...updateData } = payload;

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  });
  if (!updatedUser) throw { status: 404, message: "Không tìm thấy người dùng" };

  return sanitize(updatedUser);
};

/**
 * Lấy danh sách user có phân trang (Cho trang quản lý của Admin)
 * Khớp với: controller.listUser → GET /user/list?page=0&limit=10
 */
exports.listUser = async (page = 0, limit = 10) => {
  const filter = { deletedAt: null };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        "-password -passwordResetToken -emailVerificationToken -attendance -salaryHistory",
      )
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    data: users,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Toàn bộ user không phân trang
 * Khớp với: controller.getAllUser → GET /user/admin/all
 * Dùng cho: dropdown chọn user, export danh sách
 */
exports.getAllUser = async () => {
  return User.find({ deletedAt: null })
    .select(
      "-password -passwordResetToken -emailVerificationToken -attendance -salaryHistory",
    )
    .sort({ createdAt: -1 });
};

/**
 * Soft delete — ghi deletedAt, không xoá khỏi DB
 * Khớp với: controller.deleteUser → DELETE /user/admin/:id
 */
exports.deleteUser = async (id) => {
  if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };

  const user = await User.findByIdAndUpdate(
    id,
    { deletedAt: new Date(), isActive: false },
    { new: true },
  );

  if (!user) throw { status: 404, message: "Không tìm thấy người dùng" };

  return sanitize(user);
};
