import axios from "axios";

// Backend đang chạy ở PORT=3002
// Tránh trường hợp `.env` không reload đúng khi dev server chạy lâu.
const API_URL = "http://localhost:3002/api";

console.log("🔥 API:", API_URL);

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request: gắn token vào mọi request ────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed?.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      } catch {
        localStorage.removeItem("user");
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response: xử lý lỗi — KHÔNG reload để tránh vòng lặp ─────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    if (status === 401) {
      // KHÔNG redirect khi 401 từ chính form đăng nhập/đăng ký — để trang Login/Register hiển thị lỗi
      const isLoginOrRegister =
        url.includes("/user/login") || url.includes("/user/register");
      const isAdminPage = window.location.pathname.startsWith("/admin");
      if (!isLoginOrRegister && !isAdminPage) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
