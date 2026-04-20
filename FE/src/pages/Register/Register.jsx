import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../api";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; }
    if (form.password.length < 6) { setError("Mật khẩu cần ít nhất 6 ký tự."); return; }

    setLoading(true);
    try {
      const resData = await registerUser({ name: form.name, email: form.email, password: form.password, phone: form.phone });
      if (resData && resData.status === false) { setError(resData.message || "Đăng ký thất bại."); return; }
      navigate("/login", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || "Lỗi kết nối. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-body">

      {/* LEFT CONTENT - IMAGE */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-100 p-4">
        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative">
          <img src="https://images.unsplash.com/photo-1552066344-2464c1135c32?q=80&w=2670&auto=format&fit=crop" alt="Sneaker Collection" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>

          <div className="absolute bottom-0 left-0 p-16 text-white text-left">
            <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold mb-6 tracking-wide">THAM GIA CÙNG CHÚNG TÔI</div>
            <h2 className="text-4xl xl:text-5xl font-display font-black mb-4 leading-tight">Mở khóa<br />những đặc quyền<br />không giới hạn.</h2>
            <p className="text-slate-300 text-lg max-w-md">Trở thành thành viên để nhận voucher giảm giá 10% cho đơn hàng đầu tiên và nhiều hơn thế nữa.</p>
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT - FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 py-12">
        <div className="max-w-md w-full mx-auto">

          <div className="lg:hidden mb-12">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
              <span className="text-3xl font-display font-black tracking-tighter text-slate-900">DATN<span className="text-primary">MOI.</span></span>
            </Link>
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 mb-4 tracking-tight">Tạo tài khoản</h1>
            <p className="text-slate-500 text-lg mb-10">Gia nhập cộng đồng Sneaker lớn nhất Việt Nam ngay hôm nay.</p>
          </div>

          {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex items-center gap-2">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Họ tên</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Nguyễn Văn A" required className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Số điện thoại</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0912345678" required className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Email của bạn</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Mật khẩu</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Ít nhất 6 ký tự" required className="w-full h-14 px-5 pr-12 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <input type={showConfirmPass ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" required className="w-full h-14 px-5 pr-12 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showConfirmPass ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-14 mt-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
              {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Tạo Tài Khoản"}
            </button>
          </form>

          <p className="mt-12 text-center text-slate-500 font-medium">
            Đã có tài khoản? <Link to="/login" className="text-primary font-bold hover:underline">Đăng nhập</Link>
          </p>

        </div>
      </div>

    </div>
  );
};

export default Register;
