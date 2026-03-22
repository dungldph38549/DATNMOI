import React from "react";
import { Link } from "react-router-dom";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaFacebookF, FaTwitter, FaInstagram, FaYoutube, FaArrowRight } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 pt-20 pb-10 font-body relative overflow-hidden">
      {/* Dynamic background element */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* BRAND & CONTACT */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg">
                F
              </div>
              <h1 className="text-3xl font-display font-black tracking-tight text-white">
                Flip<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">mart</span>
              </h1>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Khám phá bộ sưu tập phong cách sống cao cấp. Chúng tôi cam kết mang đến những sản phẩm sang trọng, trẻ trung và hiện đại nhất cho thế hệ mới.
            </p>
            <div className="space-y-4 text-sm font-medium text-slate-400">
              <p className="flex items-start gap-4 hover:text-white transition-colors cursor-pointer">
                <FaMapMarkerAlt className="text-secondary mt-1 text-lg" />
                <span>Số 1, Đường Tương Lai, Quận Trẻ Trung,<br />Thành phố Mới, VN</span>
              </p>
              <p className="flex items-center gap-4 hover:text-white transition-colors cursor-pointer">
                <FaPhoneAlt className="text-secondary text-lg" />
                <span>(+84) 123 456 789</span>
              </p>
              <p className="flex items-center gap-4 hover:text-white transition-colors cursor-pointer">
                <FaEnvelope className="text-secondary text-lg" />
                <span>hello@flipmart.vn</span>
              </p>
            </div>
          </div>

          {/* CUSTOMER SERVICE */}
          <div>
            <h5 className="text-white font-bold tracking-wider mb-6 text-lg">HỖ TRỢ KHÁCH HÀNG</h5>
            <ul className="space-y-4 text-sm font-medium">
              {['Tài khoản của tôi', 'Trang thái đơn hàng', 'Chính sách đổi trả', 'Câu hỏi thường gặp', 'Giao hàng'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-primary transition-colors"></span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* EXPLORE */}
          <div>
            <h5 className="text-white font-bold tracking-wider mb-6 text-lg">KHÁM PHÁ</h5>
            <ul className="space-y-4 text-sm font-medium">
              {['Về chúng tôi', 'Tuyển dụng', 'Sản phẩm mới', 'Flash Sale', 'Blog thời trang'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-slate-400 hover:text-secondary transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-secondary transition-colors"></span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* NEWSLETTER */}
          <div>
            <h5 className="text-white font-bold tracking-wider mb-6 text-lg">ĐĂNG KÝ NHẬN TIN</h5>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Nhận ngay mã giảm giá 15% cho đơn hàng đầu tiên và thông tin ưu đãi mới nhất!
            </p>
            <div className="relative group">
              <input
                type="email"
                placeholder="Email của bạn..."
                className="w-full bg-slate-800/50 border border-slate-700 text-white px-5 py-4 rounded-2xl outline-none focus:border-primary focus:bg-slate-800 transition-all text-sm"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-primary to-secondary text-white px-5 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center">
                <FaArrowRight />
              </button>
            </div>

            <div className="mt-8 flex gap-3">
              {[FaFacebookF, FaTwitter, FaInstagram, FaYoutube].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-primary flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg hover:shadow-primary/30 text-white">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm font-medium tracking-wide">
            &copy; {new Date().getFullYear()} Flipmart. Designed with passion.
          </p>
          <div className="flex gap-2 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
            {/* Payment mockups replaced with elegant badging if needed, or simply text */}
            <span className="bg-slate-800 px-3 py-1 rounded text-xs font-bold tracking-widest uppercase">Visa</span>
            <span className="bg-slate-800 px-3 py-1 rounded text-xs font-bold tracking-widest uppercase">Mastercard</span>
            <span className="bg-slate-800 px-3 py-1 rounded text-xs font-bold tracking-widest uppercase">Momo</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;