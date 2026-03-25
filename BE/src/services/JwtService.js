const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const accessSecret =
  process.env.ACCESS_TOKEN || process.env.ACCESS_TOKEN_SECRET || "access_secret";
const refreshSecret =
  process.env.REFRESH_TOKEN || process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

// Đã sửa lại đúng chính tả: generateAccessToken
const generateAccessToken = async (payload) => {
  // Trải phẳng payload ra để dễ lấy dữ liệu (id, isAdmin)
  const access_token = jwt.sign({ ...payload }, accessSecret, {
    expiresIn: "1d", // Access Token nên để thời gian ngắn (ví dụ 1 ngày) để bảo mật
  });
  return access_token;
};

// Đã sửa lại đúng chính tả: generateRefreshToken
const generateRefreshToken = async (payload) => {
  const refresh_token = jwt.sign({ ...payload }, refreshSecret, {
    expiresIn: "365d", // Refresh token để thời gian dài (1 năm)
  });
  return refresh_token;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
