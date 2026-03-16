const User = require("../model/UserModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m", // Access token expires in 15 minutes
    });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d", // Refresh token expires in 7 days
    });
};

const registerUser = async (newUserData) => {
    const { name, email, password, phone } = newUserData;
    const checkUser = await User.findOne({ email });

    if (checkUser) {
        return {
            status: "ERR",
            message: "Email đã tồn tại",
        };
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
        data: createdUser,
    };
};

const loginUser = async (userLogin) => {
    const { email, password } = userLogin;
    const checkUser = await User.findOne({ email });

    if (!checkUser) {
        return {
            status: "ERR",
            message: "Người dùng không tồn tại",
        };
    }

    if (checkUser.googleId && !checkUser.password) {
        return {
            status: "ERR",
            message: "Tài khoản này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.",
        };
    }

    const comparePassword = bcrypt.compareSync(password, checkUser.password);
    if (!comparePassword) {
        return {
            status: "ERR",
            message: "Mật khẩu không chính xác",
        };
    }

    const access_token = generateAccessToken({
        id: checkUser._id,
        isAdmin: checkUser.isAdmin,
    });

    const refresh_token = generateRefreshToken({
        id: checkUser._id,
        isAdmin: checkUser.isAdmin,
    });

    // Save refresh token to DB
    await User.findByIdAndUpdate(checkUser._id, { refresh_token });

    const user = {
        _id: checkUser._id,
        name: checkUser.name,
        email: checkUser.email,
        phone: checkUser.phone,
        isAdmin: checkUser.isAdmin,
    };

    return {
        status: "OK",
        message: "Đăng nhập thành công",
        access_token,
        refresh_token,
        user,
    };
};

const refreshTokenService = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.refresh_token !== token) {
            return {
                status: "ERR",
                message: "Refresh Token không hợp lệ hoặc đã bị vô hiệu hóa",
            };
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
        return {
            status: "ERR",
            message: "Refresh Token đã hết hạn. Vui lòng đăng nhập lại.",
        };
    }
};

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
        // If user exists with email but no googleId, link them
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
        user,
    };
};

module.exports = {
    registerUser,
    loginUser,
    refreshTokenService,
    googleLoginOrRegister,
    generateAccessToken,
    generateRefreshToken,
};
