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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex chuẩn đã sửa

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

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => loginUser(data),
    onSuccess: (res) => {
      const payload = res?.data ?? res; // backend: { status: true, data: { status: "OK", ... } }
      const user = payload?.user;

      const isLoginOk =
        (res?.status === true || res?.status === "OK") &&
        (payload?.status === "OK" || payload?.access_token);

      if (isLoginOk && user) {
        // axiosConfig đang đọc `localStorage.user.token`, nên map đúng key ở state
        dispatch(
          updateUserInfo({
            ...user,
            token: payload?.access_token,
            refreshToken: payload?.refresh_token,
            isAdmin: !!user?.isAdmin,
            login: true,
          }),
        );
        Swal.fire("Thành công", "Đăng nhập thành công!", "success");
        // Điều hướng sang trang admin nếu user là admin
        navigate(user?.isAdmin ? "/admin" : "/");
      } else {
        Swal.fire("Lỗi", res?.message || "Đăng nhập thất bại", "error");
      }
    },
    onError: (err) => {
      Swal.fire(
        "Lỗi",
        err?.response?.data?.message || "Có lỗi xảy ra!",
        "error",
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) mutate(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center mb-8">Đăng nhập</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border ${errors.email ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-blue-500 outline-none`}
              placeholder="example@gmail.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border ${errors.password ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
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
            disabled={isPending}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-slate-400"
          >
            {isPending ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="text-blue-600 font-bold">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
