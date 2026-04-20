import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useDispatch } from "react-redux";
import { clearUser, updateUserInfo } from "../../redux/user/index";
import { rehydrateCartFromStorage } from "../../redux/cart/cartSlice";
import { loginUser } from "../../api";
import { FaEye, FaEyeSlash, FaGoogle, FaFacebookF } from "react-icons/fa";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = React.useState({ email: "", password: "" });
  const [showPass, setShowPass] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = String(formData.email || "").trim();
    const password = String(formData.password || "").trim();

    if (!email) e.email = "Vui lòng nhập email";
    else if (!emailRegex.test(email)) e.email = "Email không hợp lệ";

    if (!password) e.password = "Vui lòng nhập mật khẩu";

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
      const payload = resData?.data ?? resData;
      const user = payload?.user;
      const access_token = payload?.access_token ?? payload?.accessToken ?? "";
      const refresh_token = payload?.refresh_token ?? payload?.refreshToken ?? "";
      const isLoginOk = (resData?.status === true || resData?.status === "OK") && (payload?.status === "OK" || payload?.access_token || access_token);

      if (isLoginOk && user) {
        const isAdmin = !!user?.isAdmin;
        const authInfo = { ...user, token: access_token, refreshToken: refresh_token, isAdmin, login: true };

        if (isAdmin) {
          dispatch(clearUser());
          localStorage.removeItem("user"); localStorage.removeItem("user_v1");
          localStorage.setItem("admin_v1", JSON.stringify(authInfo));
          localStorage.removeItem("admin"); localStorage.removeItem("access_token"); localStorage.removeItem("accessToken"); localStorage.removeItem("refresh_token"); localStorage.removeItem("refreshToken"); localStorage.removeItem("token");

          Swal.fire({ title: "Thành công", text: "Đăng nhập admin thành công", icon: "success", confirmButtonColor: "#0f172a" });
          navigate("/admin", { replace: true });
        } else {
          localStorage.removeItem("admin_v1"); localStorage.removeItem("admin");
          localStorage.setItem("user", JSON.stringify(authInfo));
          dispatch(updateUserInfo(authInfo));
          dispatch(rehydrateCartFromStorage());
          Swal.fire({ title: "Thành công", text: "Chào mừng bạn trở lại", icon: "success", confirmButtonColor: "#0f172a" });
          const from = typeof location.state?.from === "string" ? location.state.from : "";
          const safeFrom = from && from !== "/login" ? from : "/";
          navigate(safeFrom, { replace: true });
        }
      } else {
        Swal.fire({ title: "Lỗi", text: resData?.message || "Đăng nhập thất bại", icon: "error", confirmButtonColor: "#ef4444" });
      }
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || err?.message || "Có lỗi xảy ra!";
      Swal.fire({ title: "Lỗi", text: msg, icon: "error", confirmButtonColor: "#ef4444" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validate()) return;
    mutate({ email: String(formData.email || "").trim(), password: String(formData.password || "").trim() });
  };

  return (
    <div className="flex min-h-screen bg-white font-body">

      {/* LEFT CONTENT - FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 py-12">
        <div className="max-w-md w-full mx-auto">

          <Link to="/" className="inline-block mb-16 hover:opacity-80 transition-opacity">
            <span className="text-3xl font-display font-black tracking-tighter text-slate-900">DATN<span className="text-primary">MOI.</span></span>
          </Link>

          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 mb-4 tracking-tight">Chào mừng<br />trở lại.</h1>
            <p className="text-slate-500 text-lg mb-10">Vui lòng đăng nhập để xem thông tin đơn hàng và tận hưởng những ưu đãi dành riêng cho bạn.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Email của bạn</label>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com"
                className={`w-full h-14 px-5 rounded-2xl border bg-slate-50 font-medium outline-none transition-all ${errors.email ? "border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50" : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10"}`}
              />
              {errors.email && <p className="text-red-500 text-xs font-semibold ml-1 mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-slate-700">Mật khẩu</label>
                <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••"
                  className={`w-full h-14 px-5 pr-12 rounded-2xl border bg-slate-50 font-medium outline-none transition-all ${errors.password ? "border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50" : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10"}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs font-semibold ml-1 mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="w-full h-14 mt-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
              {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Đăng Nhập"}
            </button>
          </form>

          <div className="mt-10">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative px-4 text-sm font-bold text-slate-400 bg-white">Hoặc đăng nhập với</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-semibold text-slate-700">
                <FaGoogle className="text-red-500" /> Google
              </button>
              <button className="flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-semibold text-slate-700">
                <FaFacebookF className="text-blue-600" /> Facebook
              </button>
            </div>
          </div>

          <p className="mt-12 text-center text-slate-500 font-medium">
            Chưa có tài khoản? <Link to="/register" className="text-primary font-bold hover:underline">Đăng ký ngay</Link>
          </p>

        </div>
      </div>

      {/* RIGHT CONTENT - IMAGE */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-100 p-4">
        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative">
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2670&auto=format&fit=crop" alt="Sneaker Collection" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>

          <div className="absolute bottom-0 left-0 p-16 text-white text-left">
            <h2 className="text-4xl xl:text-5xl font-display font-black mb-4 leading-tight">Định hình<br />phong cách<br />của chính bạn.</h2>
            <p className="text-slate-300 text-lg max-w-md">Khám phá bộ sưu tập sneakers đa dạng, chính hãng 100% với những ưu đãi tốt nhất.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
