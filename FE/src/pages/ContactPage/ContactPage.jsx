import React from "react";
import { Link } from "react-router-dom";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaPaperPlane } from "react-icons/fa";

const ContactPage = () => {
  return (
    <div className="bg-background-light min-h-screen font-body pb-20 pt-24 text-slate-800">

      {/* MAP BANNER */}
      <div className="w-full h-80 md:h-[400px] bg-slate-200 relative">
        <iframe
          title="Google Map Location"
          src="https://www.google.com/maps?q=21.0285,105.8542&z=15&output=embed"
          className="w-full h-full border-0 grayscale opacity-80"
          loading="lazy"
        ></iframe>
        <div className="absolute inset-0 bg-gradient-to-t from-background-light via-transparent to-transparent pointer-events-none"></div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl -mt-20 relative z-10">

        <div className="flex flex-col lg:flex-row gap-8">

          {/* LEFT: FORM */}
          <div className="w-full lg:w-2/3 bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <h1 className="text-3xl md:text-4xl font-display font-black text-slate-900 mb-2">Liên Hệ Với Chúng Tôi.</h1>
            <p className="text-slate-500 mb-10 text-lg">Chúng tôi luôn sẵn sàng lắng nghe mọi góp ý và giải đáp thắc mắc của bạn.</p>

            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Họ và tên <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Nguyễn Văn A" className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" placeholder="example@gmail.com" className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Tiêu đề <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Bạn cần hỗ trợ về vấn đề gì?" className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Nội dung <span className="text-red-500">*</span></label>
                <textarea rows="5" placeholder="Nhập chi tiết nội dung cần hỗ trợ..." className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none custom-scrollbar"></textarea>
              </div>

              <button type="button" className="inline-flex items-center gap-2 h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-primary transition-colors shadow-lg shadow-primary/20">
                <FaPaperPlane /> Gửi Lời Nhắn
              </button>
            </form>
          </div>

          {/* RIGHT: INFO */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 lg:mt-24">

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-start group hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <FaMapMarkerAlt size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">Địa chỉ</h3>
                <p className="text-slate-500 font-medium leading-relaxed">FPT Polytechnic, Tòa nhà F, Phố Trịnh Văn Bô, Nam Từ Liêm, Hà Nội</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-start group hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <FaPhoneAlt size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">Điện thoại</h3>
                <p className="text-slate-500 font-medium">0123 456 789</p>
                <p className="text-slate-500 font-medium">0987 654 321</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-start group hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <FaEnvelope size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">Email liên hệ</h3>
                <p className="text-slate-500 font-medium break-all">support@sneakerhouse.vn</p>
                <p className="text-slate-500 font-medium break-all">contact@sneakerhouse.vn</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default ContactPage;