import axios from "axios";

// Backend đang chạy ở PORT=3002
// Tránh trường hợp `.env` không reload đúng khi dev server chạy lâu.
const API_URL = "http://localhost:3002/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

const getAuthContext = () => {
  const isAdminContext = window.location.pathname.startsWith("/admin");
  const storageKey = isAdminContext ? "admin_v1" : "user";
  const fallbackKey = isAdminContext ? "admin" : "user_v1";
  return { isAdminContext, storageKey, fallbackKey };
};

const saveAccessToken = (nextToken, isAdminContext) => {
  const primaryKey = isAdminContext ? "admin_v1" : "user";
  const fallbackKey = isAdminContext ? "admin" : "user_v1";
  const raw = localStorage.getItem(primaryKey) || localStorage.getItem(fallbackKey);
  if (!raw || !nextToken) return;
  try {
    const parsed = JSON.parse(raw);
    const next = {
      ...parsed,
      token: nextToken,
      access_token: nextToken,
      accessToken: nextToken,
    };
    localStorage.setItem(primaryKey, JSON.stringify(next));
  } catch {
    // ignore parse error
  }
};

// ── Request: gắn token vào mọi request ────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const { isAdminContext } = getAuthContext();

    // Chọn đúng nguồn token theo ngữ cảnh:
    // - Admin: dùng `admin_v1` (tách session khỏi user)
    // - Người dùng: dùng `user` / `user_v1`
    const rawAuth = isAdminContext
      ? localStorage.getItem("admin_v1") || localStorage.getItem("admin")
      : localStorage.getItem("user") || localStorage.getItem("user_v1");

    if (rawAuth) {
      try {
        if (!config.headers) config.headers = {};
        const parsed = JSON.parse(rawAuth);

        const token =
          parsed?.token ??
          parsed?.access_token ??
          parsed?.accessToken ??
          parsed?.user?.token ??
          parsed?.user?.access_token ??
          null;

        // Fallback: đôi khi token được lưu rời (nhưng ưu tiên parsed.token)
        const directAccessToken = isAdminContext
          ? localStorage.getItem("admin_access_token") ||
            localStorage.getItem("admin_token") ||
            localStorage.getItem("token") ||
            null
          : localStorage.getItem("access_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token") ||
            null;

        const finalToken = token || directAccessToken;

        if (finalToken) {
          config.headers.Authorization = `Bearer ${finalToken}`;
          config.headers.authorization = `Bearer ${finalToken}`;
        }
      } catch {
        // Dọn sạch key tương ứng để lần sau không bị parse lỗi mãi
        if (isAdminContext) {
          localStorage.removeItem("admin_v1");
          localStorage.removeItem("admin");
        } else {
          localStorage.removeItem("user");
          localStorage.removeItem("user_v1");
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response: xử lý lỗi — KHÔNG reload để tránh vòng lặp ─────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const originalRequest = error?.config;

    if (status === 401) {
      // KHÔNG refresh ở endpoint auth để tránh loop
      const isLoginOrRegister =
        url.includes("/user/login") ||
        url.includes("/user/register") ||
        url.includes("/user/refresh-token");
      const { isAdminContext, storageKey, fallbackKey } = getAuthContext();

      if (!isLoginOrRegister && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            const rawAuth =
              localStorage.getItem(storageKey) ||
              localStorage.getItem(fallbackKey);
            if (!rawAuth) return Promise.reject(error);
            const parsed = JSON.parse(rawAuth);
            const refreshToken =
              parsed?.refreshToken ??
              parsed?.refresh_token ??
              parsed?.user?.refreshToken ??
              parsed?.user?.refresh_token ??
              null;
            if (!refreshToken) return Promise.reject(error);

            refreshPromise = refreshClient
              .post("/user/refresh-token", {
                refresh_token: refreshToken,
              })
              .then((res) => res?.data?.data?.access_token || null)
              .finally(() => {
                refreshPromise = null;
              });
          }

          const newAccessToken = await refreshPromise;
          if (newAccessToken) {
            saveAccessToken(newAccessToken, isAdminContext);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers.authorization = `Bearer ${newAccessToken}`;
            return axiosInstance(originalRequest);
          }
        } catch {
          // Không tự logout/redirect; để UI tự xử lý.
        }
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
