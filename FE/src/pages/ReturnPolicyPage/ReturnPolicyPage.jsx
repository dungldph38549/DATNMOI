import React from "react";
import { Link } from "react-router-dom";

const iconCircle =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#A67C52]/15 text-[#A67C52]";

const CheckItem = ({ children }) => (
  <li className="flex gap-3 text-sm leading-relaxed text-stone-600">
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A67C52] text-white shadow-sm"
      aria-hidden
    >
      <span className="material-symbols-outlined text-[14px] leading-none font-bold">check</span>
    </span>
    <span>{children}</span>
  </li>
);

const PolicyCard = ({ icon, title, children, footerNote }) => (
  <div className="flex h-full flex-col rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex justify-center">
      <div className={iconCircle}>
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
    </div>
    <h3 className="mt-4 text-center font-display text-lg font-bold text-stone-900">{title}</h3>
    <ul className="mt-4 flex-1 space-y-3">{children}</ul>
    {footerNote ? (
      <p className="mt-4 text-xs italic text-stone-500">{footerNote}</p>
    ) : null}
  </div>
);

const Feature = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
    <div className={`${iconCircle} mx-auto sm:mx-0`}>
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </div>
    <div>
      <p className="font-display font-bold text-stone-900">{title}</p>
      <p className="text-sm text-stone-600">{subtitle}</p>
    </div>
  </div>
);

const ReturnPolicyPage = () => {
  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-16 pt-8 font-body md:pt-12">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Breadcrumb */}
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-stone-500" aria-label="Breadcrumb">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 hover:text-[#A67C52] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-stone-400" aria-hidden>
              home
            </span>
            Trang chủ
          </Link>
          <span className="text-stone-300" aria-hidden>
            /
          </span>
          <span className="font-medium text-stone-700">Chính sách đổi trả</span>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white px-6 py-10 shadow-sm md:px-10 md:py-12 lg:px-12">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h1 className="font-display text-3xl font-black uppercase tracking-tight md:text-4xl lg:text-[2.35rem] lg:leading-tight">
                <span className="text-stone-900">Chính sách </span>
                <span className="text-[#A67C52]">đổi trả</span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-stone-600 md:text-lg">
                Hỗ trợ đổi trả dễ dàng – Minh bạch – Nhanh chóng
              </p>
              <div
                className="mt-4 h-1 w-16 rounded-full bg-[#A67C52]"
                aria-hidden
              />
            </div>

            <div className="relative flex flex-col items-center">
              {/* Decorative icon chain */}
              <div
                className="mb-4 flex w-full max-w-sm items-center justify-center gap-1 sm:gap-2"
                aria-hidden
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#A67C52]/35 bg-[#A67C52]/10 text-[#A67C52]">
                  <span className="material-symbols-outlined text-[22px]">sync</span>
                </span>
                <span className="h-px w-6 flex-1 max-w-[48px] border-t border-dashed border-[#A67C52]/40 sm:w-10" />
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#A67C52]/35 bg-[#A67C52]/10 text-[#A67C52]">
                  <span className="material-symbols-outlined text-[22px]">fact_check</span>
                </span>
                <span className="h-px w-6 flex-1 max-w-[48px] border-t border-dashed border-[#A67C52]/40 sm:w-10" />
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#A67C52]/35 bg-[#A67C52]/10 text-[#A67C52]">
                  <span className="material-symbols-outlined text-[22px]">verified_user</span>
                </span>
              </div>

              <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/80">
                <img
                  src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&auto=format&fit=crop&q=80"
                  alt="Giày sneaker — Sneaker Converse"
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Policy cards */}
        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <PolicyCard
            icon="gpp_good"
            title="Đổi trả trong 30 ngày"
            footerNote="* Thời gian có thể thay đổi tùy khu vực"
          >
            <CheckItem>1 đổi 1 hoặc hoàn tiền trong 30 ngày</CheckItem>
            <CheckItem>Sản phẩm cần còn nguyên trạng</CheckItem>
          </PolicyCard>

          <PolicyCard icon="gpp_good" title="Điều kiện đổi trả">
            <CheckItem>Sản phẩm còn mới, chưa qua sử dụng</CheckItem>
            <CheckItem>Giữ nguyên hộp, tem mác và quà tặng</CheckItem>
          </PolicyCard>

          <PolicyCard icon="event_available" title="Thời gian & phí đổi trả">
            <CheckItem>Đổi hàng: 2 - 5 ngày (tùy khu vực)</CheckItem>
            <CheckItem>Miễn phí đổi hàng lần đầu (các lần sau: phí ship)</CheckItem>
          </PolicyCard>

          <PolicyCard icon="assignment_add" title="Quy trình đổi trả">
            <CheckItem>Bước 1: Liên hệ shop để yêu cầu đổi trả</CheckItem>
            <CheckItem>Bước 2: Gửi sản phẩm về địa chỉ shop</CheckItem>
            <CheckItem>Bước 3: Shop xác nhận và đổi hàng</CheckItem>
          </PolicyCard>
        </section>

        {/* Bottom bar */}
        <section className="mt-10 rounded-3xl border border-stone-200/90 bg-white px-6 py-8 shadow-sm md:px-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <Feature icon="headset_mic" title="Hỗ trợ 24/7" subtitle="Tư vấn nhanh chóng" />
            <Feature icon="verified_user" title="Đảm bảo 100%" subtitle="Sản phẩm chính hãng" />
            <Feature icon="electric_bolt" title="Nhanh chóng" subtitle="Xử lý và đổi trả dễ dàng" />
            <Feature icon="local_shipping" title="Giao hàng toàn quốc" subtitle="Nhanh chóng - Tiện lợi" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReturnPolicyPage;
