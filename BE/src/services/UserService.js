// ================================================================
// services/UserService.js — SneakerConverse (Merged Version)
// ================================================================
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // Dùng bcryptjs đồng bộ với bản 69d302
const bcryptNative = require("bcrypt");
const User = require("../models/UserModel");
const Voucher = require("../models/VoucherModel");

// ── Helper: Validate ObjectId ──────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── Helper: Tạo Access Token ──────────────────
const generateAccessToken = (payload) => {
  const secret = process.env.ACCESS_TOKEN || process.env.ACCESS_TOKEN_SECRET || "access_secret";
  return jwt.sign({ payload }, secret, {
    expiresIn: "7d", // Có thể chỉnh 15m nếu cần bảo mật hơn
  });
};

// ── Helper: Tạo Refresh Token ──────────────────
const generateRefreshToken = (payload) => {
  const refreshSecret = process.env.REFRESH_TOKEN || process.env.REFRESH_TOKEN_SECRET || "refresh_secret";
  return jwt.sign({ payload }, refreshSecret, {
    expiresIn: "30d",
  });
};

// ── Helper: Loại bỏ các field nhạy cảm trước khi trả về ───────
const sanitize = (user) => {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.passwordResetToken;
    delete obj.emailVerificationToken;
    delete obj.refresh_token;
    return obj;
};

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
const escapeRegex = (str = "") =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createWelcomeVoucherCode = (userId) => {
  const suffix = String(userId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase();
  const random4 = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WELCOME50-${suffix || "USER"}-${random4}`;
};

const issuePersonalWelcomeVoucher = async (user) => {
  if (!user?._id) return null;
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  for (let i = 0; i < 5; i += 1) {
    const code = createWelcomeVoucherCode(user._id);
    try {
      const created = await Voucher.create({
        code,
        description:
          "Voucher chào mừng thành viên mới: Phạm vi áp dụng: Toàn bộ sản phẩm. Điều kiện: Mỗi đơn hàng chỉ áp dụng cho 1 sản phẩm.",
        type: "percent",
        value: 50,
        minOrderValue: 0,
        maxDiscount: 0,
        startDate,
        endDate,
        usageLimit: 1,
        usedCount: 0,
        userLimit: 1,
        isActive: true,
        isDeleted: false,
        applicableProducts: [],
        applicableCategories: [],
        ownerUserId: user._id,
      });
      return created;
    } catch (err) {
      if (err?.code === 11000) continue;
      throw err;
    }
  }
  throw new Error("Không thể tạo mã voucher cá nhân duy nhất");
};

// ================================================================
// AUTH (ĐĂNG KÝ, ĐĂNG NHẬP, GOOGLE, REFRESH)
// ================================================================

/**
 * Đăng ký tài khoản mới
 */
const registerUser = async (newUserData) => {
  const { name, email, password, phone } = newUserData;
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw { status: 409, message: "Email này đã được sử dụng!" };
  }

  const createdUser = await User.create({
    name,
    email: normalizedEmail,
    // UserModel pre-save sẽ hash mật khẩu, không hash ở service để tránh double-hash.
    password,
    phone,
  });

  try {
    await issuePersonalWelcomeVoucher(createdUser);
  } catch (voucherError) {
    console.error(
      "[UserService] Không thể cấp voucher chào mừng:",
      voucherError?.message || voucherError,
    );
  }

  return {
    status: "OK",
    message: "Đăng ký thành công",
    data: sanitize(createdUser),
  };
};

// Giữ tương thích với controller cũ: createUser = registerUser
const createUser = registerUser;

/**
 * Đăng nhập tài khoản thông thường
 */
const loginUser = async (userLogin) => {
  const { email, password } = userLogin;
  const normalizedEmail = normalizeEmail(email);
  let user = await User.findOne({ email: normalizedEmail, deletedAt: null });
  if (!user) {
    user = await User.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
      deletedAt: null,
    });
  }

  if (!user) {
    throw { status: 404, message: "Người dùng không tồn tại" };
  }

  if (user.googleId && !user.password) {
    throw {
      status: 400,
      message:
        "Tài khoản này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.",
    };
  }

  // UserModel dùng isActive (soft ban) thay vì isBanned
  if (user.isActive === false || user.isBanned) {
    throw { status: 403, message: "Tài khoản của bạn đã bị khoá!" };
  }

  // So sánh mật khẩu với bcrypt
  let isMatch = false;
  if (user.password) {
    try {
      isMatch = bcrypt.compareSync(password, user.password);
    } catch {
      isMatch = false;
    }

    // Fallback cho dữ liệu cũ hash bằng lib khác.
    if (!isMatch) {
      try {
        isMatch = bcryptNative.compareSync(password, user.password);
      } catch {
        // ignore
      }
    }
  }

  // TRƯỜNG HỢP CŨ: mật khẩu lưu dạng plain-text
  // Nếu so sánh bcrypt thất bại nhưng chuỗi trùng khớp,
  // coi như đúng mật khẩu và tự động hash lại để nâng cấp.
  if (!isMatch && password && user.password === password) {
    // Ghi plain password để pre-save hash đúng 1 lần.
    user.password = password;
    await user.save();
    isMatch = true;
  }

  if (!isMatch) {
    throw { status: 401, message: "Mật khẩu không chính xác" };
  }

  const access_token = generateAccessToken({
    id: user._id,
    isAdmin: user.isAdmin,
  });
  const refresh_token = generateRefreshToken({
    id: user._id,
    isAdmin: user.isAdmin,
  });

  // Lưu refresh token và cập nhật login info
  user.refresh_token = refresh_token;
  user.lastLogin = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  await user.save();

  return {
    status: "OK",
    message: "Đăng nhập thành công",
    access_token,
    refresh_token,
    user: sanitize(user),
  };
};

/**
 * Đăng nhập hoặc Đăng ký bằng Google
 */
const googleLoginOrRegister = async (googleUser) => {
  const { googleId, email, name, avatar } = googleUser;
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      googleId,
      email,
      name,
      avatar,
      isAdmin: false,
    });
    try {
      await issuePersonalWelcomeVoucher(user);
    } catch (voucherError) {
      console.error(
        "[UserService] Không thể cấp voucher chào mừng (Google):",
        voucherError?.message || voucherError,
      );
    }
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.avatar = avatar;
    await user.save();
  }

  const access_token = generateAccessToken({
    id: user._id,
    isAdmin: user.isAdmin,
  });
  const refresh_token = generateRefreshToken({
    id: user._id,
    isAdmin: user.isAdmin,
  });

  await User.findByIdAndUpdate(user._id, { refresh_token });

  return {
    status: "OK",
    message: "Đăng nhập Google thành công",
    access_token,
    refresh_token,
    user: sanitize(user),
  };
};

/**
 * Làm mới Access Token từ Refresh Token
 */
const refreshTokenService = async (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.REFRESH_TOKEN || process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
    );
    const user = await User.findById(decoded.payload.id);

    if (!user || user.refresh_token !== token) {
      throw new Error();
    }

    const access_token = generateAccessToken({
      id: user._id,
      isAdmin: user.isAdmin,
    });

    return {
      status: "OK",
      message: "Làm mới Access Token thành công",
      access_token,
    };
  } catch (err) {
    throw {
      status: 401,
      message:
        "Refresh Token không hợp lệ hoặc hết hạn. Vui lòng đăng nhập lại.",
    };
  }
};

// ================================================================
// QUẢN LÝ NGƯỜI DÙNG (ADMIN / USER)
// ================================================================

// Lấy user theo ID
const getUserById = async (id) => {
  if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };
  const user = await User.findById(id);
  if (!user || user.deletedAt) {
    throw { status: 404, message: "Không tìm thấy người dùng" };
  }
  return sanitize(user);
};

// User tự cập nhật thông tin cơ bản
const updateCustomer = async (id, payload) => {
  if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };

  const { name, phone, address, avatar, email } = payload;

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { name, phone, address, avatar, email },
    { new: true },
  );

  if (!updatedUser) throw { status: 404, message: "Không tìm thấy người dùng" };
  return sanitize(updatedUser);
};

// Admin cập nhật user bất kỳ (trừ mật khẩu)
const updateUser = async (id, payload) => {
  if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };

  // Frontend đang gửi { isAdmin, isStaff, isBanned }.
  // Trong UserModel, quyền được lưu ở field `role`, còn trạng thái bị khoá dùng `isActive`.
  const {
    password,
    isAdmin,
    isStaff,
    isBanned,
    banReason,
    // cho phép gửi thẳng role nếu frontend có (dự phòng)
    role: requestedRole,
    ...rest
  } = payload;

  const updateData = { ...rest };

  // Map quyền từ boolean sang role
  if (typeof isAdmin === "boolean" || typeof isStaff === "boolean") {
    // Ưu tiên admin > staff > customer
    if (isAdmin === true) updateData.role = "admin";
    else if (isStaff === true) updateData.role = "staff";
    else updateData.role = "customer";
  } else if (typeof requestedRole === "string") {
    updateData.role = requestedRole;
  }

  // Map isBanned -> isActive
  if (typeof isBanned === "boolean") {
    if (isBanned) {
      const reason = String(banReason || "").trim();
      if (reason.length < 5) {
        throw { status: 422, message: "Lý do khóa tài khoản tối thiểu 5 ký tự" };
      }
      updateData.banReason = reason;
    } else {
      updateData.banReason = "";
    }
    updateData.isActive = !isBanned;
  }

  // password của admin hiện chưa được hỗ trợ cập nhật tại đây
  const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
  if (!updatedUser) throw { status: 404, message: "Không tìm thấy người dùng" };
  return sanitize(updatedUser);
};

// Admin: danh sách user có phân trang
// scope: "all" | "customers" | "staff"
// staff = chỉ nhân viên / quản lý / quản trị — không bao gồm khách hàng (customer)
const listUser = async (page = 0, limit = 10, { scope = "all" } = {}) => {
  const filter = { deletedAt: null };
  if (scope === "customers") {
    filter.role = "customer";
  } else if (scope === "staff") {
    filter.role = { $in: ["staff", "manager", "admin"] };
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password -refresh_token")
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { data: users, total, page, limit, pages: Math.ceil(total / limit) };
};

/**
 * Admin tạo tài khoản nhân viên (staff / manager / admin) — không dùng cho khách hàng.
 */
const createUserByAdmin = async (body) => {
  const { name, email, password, phone, role = "staff" } = body || {};
  const allowedRoles = ["staff", "manager", "admin"];
  if (!name || !email || !password || !phone) {
    throw { status: 422, message: "Vui lòng điền đầy đủ họ tên, email, mật khẩu và SĐT" };
  }
  if (!allowedRoles.includes(role)) {
    throw {
      status: 400,
      message: "Chỉ được tạo tài khoản nhân viên (staff, manager hoặc admin)",
    };
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({
    email: normalizedEmail,
    deletedAt: null,
  });
  if (existingUser) {
    throw { status: 409, message: "Email này đã được sử dụng!" };
  }

  const createdUser = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    phone: String(phone).trim(),
    role,
  });

  return sanitize(createdUser);
};

// Admin: lấy toàn bộ user (không phân trang)
const getAllUser = async () => {
  return User.find({ deletedAt: null })
    .select("-password -refresh_token")
    .sort({ createdAt: -1 });
};

// Admin: soft delete user
const deleteUser = async (id) => {
  if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };
  const user = await User.findByIdAndUpdate(
    id,
    { deletedAt: new Date(), isActive: false },
    { new: true },
  );
  if (!user) throw { status: 404, message: "Không tìm thấy người dùng" };
  return sanitize(user);
};

module.exports = {
  registerUser,
  createUser,
  createUserByAdmin,
  loginUser,
  googleLoginOrRegister,
  refreshTokenService,
  getUserById,
  updateCustomer,
  updateUser,
  listUser,
  getAllUser,
  deleteUser,
  generateAccessToken,
  generateRefreshToken,
};