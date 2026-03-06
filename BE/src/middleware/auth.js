const jwt = require("jsonwebtoken");
const User = require("../model/UserModel");

// ── protect: Xác thực JWT token ─────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // Lấy token từ header Authorization: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "ERR",
        message: "Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN || "access_token");

    // Tìm user từ token
    const user = await User.findById(decoded.id || decoded._id).select(
      "-password",
    );

    if (!user) {
      return res.status(401).json({
        status: "ERR",
        message: "Người dùng không tồn tại.",
      });
    }

    // Gán user vào request, thêm role dựa trên isAdmin
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.isAdmin ? "admin" : "user",
    };

    next();
  } catch (err) {
    return res.status(401).json({
      status: "ERR",
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }
};

// ── restrictTo: Phân quyền theo role ─────────────────────────
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "ERR",
        message: "Bạn không có quyền thực hiện hành động này.",
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
