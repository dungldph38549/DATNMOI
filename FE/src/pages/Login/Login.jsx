import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useDispatch } from "react-redux";
import { updateUserInfo } from "../../redux/user/index";
import { loginUser } from "../../api";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = React.useState({ email: "", password: "" });
  const [showPass, setShowPass] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      e.email = "Vui lòng nhập email";
    } else if (!emailRegex.test(formData.email)) {
      e.email = "Email không đúng định dạng (VD: example@gmail.com)";
    }

    if (!formData.password) {
      e.password = "Vui lòng nhập mật khẩu";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const { mutate, isLoading } = useMutation({
    mutationFn: (data) => loginUser(data),
    onSuccess: (resData) => {
      // Backend: { status: true, data: { status:"OK", access_token, refresh_token, user } }
      const payload = resData?.data ?? resData;
      const user = payload?.user;

      const access_token =
        payload?.access_token ?? payload?.accessToken ?? "";
      const refresh_token =
        payload?.refresh_token ?? payload?.refreshToken ?? "";

      const isLoginOk =
        (resData?.status === true || resData?.status === "OK") &&
        (payload?.status === "OK" || payload?.access_token || access_token);

      if (isLoginOk && user) {
        const userInfo = {
          ...user,
          token: access_token,
          refreshToken: refresh_token,
          isAdmin: !!user?.isAdmin,
          login: true,
        };

        dispatch(updateUserInfo(userInfo));
        localStorage.setItem("user", JSON.stringify(userInfo));

        Swal.fire("Thành công", "Đăng nhập thành công!", "success");
        navigate(user?.isAdmin ? "/admin" : "/", { replace: true });
      } else {
        Swal.fire("Lỗi", resData?.message || "Đăng nhập thất bại", "error");
      }
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.msg ||
        err?.message ||
        "Có lỗi xảy ra!";

      const raw = err?.response?.data;
      const detail = raw ? `\n\nChi tiết:\n${JSON.stringify(raw, null, 2)}` : "";

      Swal.fire("Lỗi", msg + detail, "error");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validate()) return;
    mutate(formData);
  };

  const inputBase =
    "w-full px-5 py-4 rounded-xl border bg-transparent focus:ring-2 focus:ring-primary outline-none text-base transition-all";
  const inputNormal = `${inputBase} border-slate-300 dark:border-slate-700`;
  const inputError = `${inputBase} border-red-400 focus:ring-red-300`;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 to-background-light dark:from-primary/20 dark:to-background-dark px-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10">
        <div className="flex flex-col items-center mb-8">
          <span className="material-symbols-outlined text-primary text-6xl mb-2">
            skateboarding
          </span>
          <h1 className="text-2xl font-bold tracking-tight">SneakerHouse</h1>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black mb-2">Đăng nhập</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Chào mừng bạn quay trở lại SneakerHouse
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="example@gmail.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? inputError : inputNormal}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium" htmlFor="password">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary font-semibold hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? inputError : inputNormal}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((prev) => !prev)}
                className="absolute right-3 top-3.5 text-slate-400"
              >
                {showPass ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all text-base flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                  />
                </svg>
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>

          <div className="flex items-center my-8">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            <span className="px-4 text-xs text-slate-400 font-semibold tracking-widest">
              HOẶC
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-semibold text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-semibold text-sm"
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="#1877F2"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.49c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>

          <p className="text-center mt-6 text-sm text-slate-600">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-blue-600 font-bold">
              Đăng ký ngay
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
};

export default Login;
