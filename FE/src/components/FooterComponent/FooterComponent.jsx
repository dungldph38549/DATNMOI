import React from "react";
import { Link } from "react-router-dom";

const FooterComponent = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#f7f7f7] border-t border-neutral-200/80 font-body text-neutral-900">
      <div className="container mx-auto px-4 max-w-7xl py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 text-left">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-neutral-900 mb-4">
              Sneaker <span className="text-convot-sage font-semibold">house</span>
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Nâng niu từng bước chân của bạn bằng những đôi giày chất lượng và phong cách nhất.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-4">Dịch vụ khách hàng</h4>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li>
                <Link to="/terms" className="hover:text-neutral-900 transition-colors">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-neutral-900 transition-colors">
                  Hướng dẫn chọn size
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-neutral-900 transition-colors">
                  Vận chuyển
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-4">Cửa hàng</h4>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li>
                <Link to="/contact" className="hover:text-neutral-900 transition-colors">
                  Hệ thống cửa hàng
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-neutral-900 transition-colors">
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-neutral-900 transition-colors">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-4">Mạng xã hội</h4>
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                aria-label="Website"
              >
                <span className="material-symbols-outlined text-[20px] font-light">public</span>
              </a>
              <a
                href="mailto:support@sneakerhouse.vn"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                aria-label="Email"
              >
                <span className="material-symbols-outlined text-[20px] font-light">alternate_email</span>
              </a>
              <Link
                to="/contact"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                aria-label="Chia sẻ / Liên hệ"
              >
                <span className="material-symbols-outlined text-[20px] font-light">share</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200/90 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
          <p>© {year} SNEAKER HOUSE. ALL RIGHTS RESERVED.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/terms" className="hover:text-neutral-900 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-neutral-900 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterComponent;
