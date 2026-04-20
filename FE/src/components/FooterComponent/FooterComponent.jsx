import React from "react";
import { Link } from "react-router-dom";
import ScSneakerLogo from "./ScSneakerLogo";

/** Liên kết cột — gạch dưới chạy từ trái, nhấc nhẹ, màu sage */
const footerNavLinkClass =
  "relative inline-flex w-fit max-w-full items-center rounded-lg px-2.5 -mx-2.5 py-1.5 text-sm text-neutral-600 transition-all duration-300 ease-out " +
  "hover:text-convot-sage hover:-translate-y-px hover:bg-white/85 hover:shadow-[0_6px_20px_-4px_rgba(139,168,142,0.22)] " +
  "after:pointer-events-none after:absolute after:left-2.5 after:right-2.5 after:bottom-1 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-convot-sage/90 after:transition-transform after:duration-300 after:ease-out " +
  "hover:after:scale-x-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-convot-sage/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]";

/** Link dòng legal — tinh hơn */
const footerLegalLinkClass =
  "relative inline-flex rounded-md px-2.5 py-1.5 text-xs text-neutral-500 transition-all duration-300 ease-out " +
  "hover:text-convot-sage hover:bg-white/70 " +
  "after:absolute after:left-2 after:right-2 after:bottom-0.5 after:h-px after:origin-center after:scale-x-0 after:bg-convot-sage/70 after:transition-transform after:duration-300 hover:after:scale-x-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-convot-sage/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]";

/** Nút tròn mạng xã hội — viền & nền sage, icon nhẹ nảy */
const socialBtnClass =
  "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300/90 bg-white text-neutral-600 shadow-sm " +
  "transition-all duration-300 ease-out " +
  "hover:-translate-y-0.5 hover:scale-[1.06] hover:border-convot-sage hover:bg-gradient-to-br hover:from-convot-sage/12 hover:to-convot-sage/5 hover:text-convot-sage hover:shadow-[0_8px_24px_-6px_rgba(139,168,142,0.45)] " +
  "active:translate-y-0 active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-convot-sage/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]";

const FooterComponent = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200/80 bg-[#f7f7f7] font-body text-neutral-900">
      <div className="container mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 text-left sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="flex max-w-full flex-col items-center gap-3">
            <h3 className="w-fit whitespace-nowrap font-display text-sm tracking-tight text-center">
              <span className="font-black text-neutral-900 transition-colors duration-300">SNEAKER</span>
              <span className="font-semibold text-convot-sage transition-colors duration-300">CONVERSE</span>
            </h3>
            <ScSneakerLogo className="shrink-0" />
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-900">
              Dịch vụ khách hàng
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/chinh-sach-doi-tra" className={footerNavLinkClass}>
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link to="/huong-dan-chon-size" className={footerNavLinkClass}>
                  Hướng dẫn chọn size
                </Link>
              </li>
              <li>
                <Link to="/van-chuyen" className={footerNavLinkClass}>
                  Vận chuyển
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-900">Cửa hàng</h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/he-thong-cua-hang" className={footerNavLinkClass}>
                  Hệ thống cửa hàng
                </Link>
              </li>
              <li>
                <Link to="/tuyen-dung" className={footerNavLinkClass}>
                  Tuyển dụng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-900">Mạng xã hội</h4>
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className={socialBtnClass}
                aria-label="Website"
              >
                <span className="material-symbols-outlined text-[20px] font-light">public</span>
              </a>
              <a href="mailto:support@sneakerconverse.vn" className={socialBtnClass} aria-label="Email">
                <span className="material-symbols-outlined text-[20px] font-light">alternate_email</span>
              </a>
              <Link to="/contact" className={socialBtnClass} aria-label="Chia sẻ / Liên hệ">
                <span className="material-symbols-outlined text-[20px] font-light">share</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-neutral-200/90 pt-8 text-xs text-neutral-500 md:flex-row md:justify-between">
          <p className="text-center md:text-left">© {year} SNEAKER CONVERSE. ALL RIGHTS RESERVED.</p>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
            <Link to="/terms" className={footerLegalLinkClass}>
              Privacy Policy
            </Link>
            <span className="hidden text-neutral-300 sm:inline" aria-hidden>
              |
            </span>
            <Link to="/terms" className={footerLegalLinkClass}>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterComponent;
