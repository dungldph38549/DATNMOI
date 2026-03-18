const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// Đã sửa lại đúng chính tả: generateAccessToken
const generateAccessToken = async (payload) => {
  // Trải phẳng payload ra để dễ lấy dữ liệu (id, isAdmin)
  const access_token = jwt.sign({ ...payload }, process.env.ACCESS_TOKEN, {
    expiresIn: "1d", // Access Token nên để thời gian ngắn (ví dụ 1 ngày) để bảo mật
  });
  return access_token;
};

// Đã sửa lại đúng chính tả: generateRefreshToken
const generateRefreshToken = async (payload) => {
  const refresh_token = jwt.sign({ ...payload }, process.env.REFRESH_TOKEN, {
    expiresIn: "365d", // Refresh token để thời gian dài (1 năm)
  });
  return refresh_token;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
