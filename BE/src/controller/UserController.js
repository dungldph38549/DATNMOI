const UserService = require("../service/UserService");
const User = require("../model/UserModel");

const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const reg = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
        const isCheckEmail = reg.test(email);

        if (!name || !email || !password || !phone) {
            return res.status(200).json({
                status: "ERR",
                message: "Vui lòng nhập đầy đủ thông tin",
            });
        } else if (!isCheckEmail) {
            return res.status(200).json({
                status: "ERR",
                message: "Email không hợp lệ",
            });
        }

        const result = await UserService.registerUser(req.body);
        return res.status(200).json(result);
    } catch (err) {
        console.error("Register Error:", err);
        return res.status(500).json({
            status: "ERR",
            message: err.message || "Lỗi hệ thống",
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const reg = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
        const isCheckEmail = reg.test(email);

        if (!email || !password) {
            return res.status(200).json({
                status: "ERR",
                message: "Vui lòng nhập email và mật khẩu",
            });
        } else if (!isCheckEmail) {
            return res.status(200).json({
                status: "ERR",
                message: "Email không hợp lệ",
            });
        }

        const result = await UserService.loginUser(req.body);
        return res.status(200).json(result);
    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({
            status: "ERR",
            message: err.message || "Lỗi hệ thống",
        });
    }
};

const logout = async (req, res) => {
    try {
        const userId = req.user._id;
        await User.findByIdAndUpdate(userId, { refresh_token: null });

        return res.status(200).json({
            status: "OK",
            message: "Đăng xuất thành công",
        });
    } catch (err) {
        console.error("Logout Error:", err);
        return res.status(500).json({
            status: "ERR",
            message: err.message || "Lỗi hệ thống",
        });
    }
};

const refreshToken = async (req, res) => {
    try {
        const token = req.body.token || req.headers.token;
        if (!token) {
            return res.status(200).json({
                status: "ERR",
                message: "Vui lòng cung cấp Refresh Token",
            });
        }

        const result = await UserService.refreshTokenService(token);
        return res.status(200).json(result);
    } catch (err) {
        console.error("Refresh Token Error:", err);
        return res.status(500).json({
            status: "ERR",
            message: err.message || "Lỗi hệ thống",
        });
    }
};

const getDetailsUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select("-password -refresh_token");

        if (!user) {
            return res.status(200).json({
                status: "ERR",
                message: "Người dùng không tồn tại",
            });
        }

        return res.status(200).json({
            status: "OK",
            message: "Lấy thông tin người dùng thành công",
            data: user,
        });
    } catch (err) {
        console.error("Get Details Error:", err);
        return res.status(500).json({
            status: "ERR",
            message: err.message || "Lỗi hệ thống",
        });
    }
};

const googleCallback = async (req, res) => {
    try {
        const { googleId, email, name, avatar } = req.body;

        if (!googleId || !email) {
            return res.status(200).json({
                status: "ERR",
                message: "Thông tin Google không đầy đủ",
            });
        }

        const result = await UserService.googleLoginOrRegister({
            googleId,
            email,
            name,
            avatar,
        });
        return res.status(200).json(result);
    } catch (err) {
        console.error("Google Callback Error:", err);
        return res.status(500).json({
            status: "ERR",
            message: err.message || "Lỗi hệ thống",
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    getDetailsUser,
    googleCallback,
};
