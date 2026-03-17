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
    if (!formData.email.trim()) e.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      e.email = "Email không hợp lệ";
    if (!formData.password) e.password = "Vui lòng nhập mật khẩu";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const { mutate, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: async (data) => {
      const userInfo = {
        id: data.data._id,
        name: data.data.name,
        email: data.data.email,
        phone: data.data.phone || "",
        isAdmin: data.data.isAdmin || false,
        isGuest: false,
        token: data.acess_token || "",
        refreshToken: data.refresh_token || "",
        address: data.data.address || [],
        login: true,
        avatar: data.data.avatar || "",
      };

      // ✅ Lưu vào Redux
      dispatch(updateUserInfo(userInfo));

      // ✅ Lưu vào localStorage để axiosConfig đọc được token
      localStorage.setItem("user", JSON.stringify(userInfo));

      await Swal.fire({
        title: "Đăng nhập thành công!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      navigate(data.data.isAdmin ? "/admin" : "/");
    },
    onError: (error) => {
      Swal.fire({
        title: "Đăng nhập thất bại!",
        text:
          error?.response?.data?.message || "Email hoặc mật khẩu không đúng.",
        icon: "error",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isPending) return;
    if (!validate()) return;
    mutate(formData);
  };

  const inputBase =
    "w-full px-5 py-4 rounded-xl border bg-transparent focus:ring-2 focus:ring-primary outline-none text-base transition-all";
  const inputNormal = `${inputBase} border-slate-300 dark:border-slate-700`;
  const inputError = `${inputBase} border-red-400 focus:ring-red-300`;

  const EyeIcon = ({ show }) => (
    <svg
      className="w-5 h-5 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {show ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
        />
      ) : (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </>
      )}
    </svg>
  );

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 to-background-light dark:from-primary/20 dark:to-background-dark px-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <span className="material-symbols-outlined text-primary text-6xl mb-2">
            skateboarding
          </span>
          <h1 className="text-2xl font-bold tracking-tight">SneakerHouse</h1>
        </div>

        {/* Tiêu đề */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black mb-2">Đăng nhập</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Chào mừng bạn quay trở lại SneakerHouse
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="email">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? inputError : inputNormal}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {errors.email}
              </p>
            )}
          </div>

          {/* Mật khẩu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium" htmlFor="password">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <a
                href="/forgot-password"
                className="text-xs text-primary font-semibold hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className={`${errors.password ? inputError : inputNormal} pr-12`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <EyeIcon show={showPass} />
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all text-base flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? (
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
        </form>

        {/* Divider */}
        <div className="flex items-center my-8">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          <span className="px-4 text-xs text-slate-400 font-semibold tracking-widest">
            HOẶC
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
        </div>

        {/* Social buttons */}
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

        {/* Link đăng ký */}
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-primary font-bold hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </main>
  );
};

export default Login;
