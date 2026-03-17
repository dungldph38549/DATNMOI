// ================================================================
// services/UserService.js — SneakerHouse (Merged Version)
// ================================================================
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // Dùng bcryptjs đồng bộ với bản 69d302
const User = require("../models/UserModel");

// ── Helper: Validate ObjectId ──────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── Helper: Tạo Access Token ──────────────────
const generateAccessToken = (payload) => {
    return jwt.sign({ payload }, process.env.ACCESS_TOKEN || "access_secret", {
        expiresIn: "7d", // Bạn có thể chỉnh lại 15m nếu muốn bảo mật cao hơn
    });
};

// ── Helper: Tạo Refresh Token ──────────────────
const generateRefreshToken = (payload) => {
    return jwt.sign({ payload }, process.env.REFRESH_TOKEN || "refresh_secret", {
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

// ================================================================
// AUTH (ĐĂNG KÝ, ĐĂNG NHẬP, GOOGLE, REFRESH)
// ================================================================

/**
 * Đăng ký tài khoản mới
 */
const registerUser = async (newUserData) => {
    const { name, email, password, phone } = newUserData;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw { status: 409, message: "Email này đã được sử dụng!" };
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const createdUser = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
    });

    return {
        status: "OK",
        message: "Đăng ký thành công",
        data: sanitize(createdUser),
    };
};

/**
 * Đăng nhập tài khoản thông thường
 */
const loginUser = async (userLogin) => {
    const { email, password } = userLogin;
    const user = await User.findOne({ email, deletedAt: null });

    if (!user) {
        throw { status: 404, message: "Người dùng không tồn tại" };
    }

    if (user.googleId && !user.password) {
        throw { status: 400, message: "Tài khoản này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google." };
    }

    if (user.isBanned) {
        throw { status: 403, message: "Tài khoản của bạn đã bị khoá!" };
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
        throw { status: 401, message: "Mật khẩu không chính xác" };
    }

    const access_token = generateAccessToken({ id: user._id, isAdmin: user.isAdmin });
    const refresh_token = generateRefreshToken({ id: user._id, isAdmin: user.isAdmin });

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
    } else if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = avatar;
        await user.save();
    }

    const access_token = generateAccessToken({ id: user._id, isAdmin: user.isAdmin });
    const refresh_token = generateRefreshToken({ id: user._id, isAdmin: user.isAdmin });

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
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN || "refresh_secret");
        const user = await User.findById(decoded.payload.id);

        if (!user || user.refresh_token !== token) {
            throw new Error();
        }

        const access_token = generateAccessToken({ id: user._id, isAdmin: user.isAdmin });

        return {
            status: "OK",
            message: "Làm mới Access Token thành công",
            access_token,
        };
    } catch (err) {
        throw { status: 401, message: "Refresh Token không hợp lệ hoặc hết hạn. Vui lòng đăng nhập lại." };
    }
};

// ================================================================
// QUẢN LÝ NGƯỜI DÙNG (ADMIN / USER)
// ================================================================

const updateCustomer = async (id, payload) => {
    if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };
    
    // Chỉ cho phép update các field cơ bản
    const { name, phone, address, avatar } = payload;
    const updatedUser = await User.findByIdAndUpdate(id, { name, phone, address, avatar }, { new: true });
    
    if (!updatedUser) throw { status: 404, message: "Không tìm thấy người dùng" };
    return sanitize(updatedUser);
};

const updateUser = async (id, payload) => {
    if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };
    const { password, ...updateData } = payload; // Không cho phép đổi pass qua đây
    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedUser) throw { status: 404, message: "Không tìm thấy người dùng" };
    return sanitize(updatedUser);
};

const listUser = async (page = 0, limit = 10) => {
    const filter = { deletedAt: null };
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

const getAllUser = async () => {
    return User.find({ deletedAt: null }).select("-password -refresh_token").sort({ createdAt: -1 });
};

const deleteUser = async (id) => {
    if (!isValidId(id)) throw { status: 400, message: "ID không hợp lệ" };
    const user = await User.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false }, { new: true });
    if (!user) throw { status: 404, message: "Không tìm thấy người dùng" };
    return sanitize(user);
};

module.exports = {
    registerUser,
    loginUser,
    googleLoginOrRegister,
    refreshTokenService,
    updateCustomer,
    updateUser,
    listUser,
    getAllUser,
    deleteUser,
    generateAccessToken,
    generateRefreshToken,
};