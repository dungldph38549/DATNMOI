import React from "react";
import { Link } from "react-router-dom";

const brownIconWrap =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6B5344]/12 text-[#6B5344]";

const Card = ({ icon, title, children }) => (
  <div className="flex h-full flex-col rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
    <div className={brownIconWrap}>
      <span className="material-symbols-outlined text-[26px]">{icon}</span>
    </div>
    <h3 className="mt-4 font-display text-lg font-bold text-[#5c4033]">{title}</h3>
    <div className="mt-3 flex-1 text-sm leading-relaxed text-stone-600">{children}</div>
  </div>
);

const Feature = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3 sm:gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6B5344]/12 text-[#6B5344] mx-auto sm:mx-0">
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </div>
    <div>
      <p className="font-display font-bold text-[#5c4033]">{title}</p>
      <p className="text-sm text-stone-600">{subtitle}</p>
    </div>
  </div>
);

const ShippingPolicyPage = () => {
  return (
    <div className="font-body bg-convot-cream pb-16 pt-8 md:pt-12">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-stone-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-[#6B5344] transition-colors">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li className="font-medium text-stone-700">Vận chuyển</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-gradient-to-br from-[#faf6f1] via-white to-[#f3ebe3] px-6 py-10 md:px-10 md:py-12 lg:px-14">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-8">
            <div>
              <h1 className="font-display text-3xl font-black uppercase tracking-tight text-[#5c4033] md:text-4xl lg:text-[2.5rem] lg:leading-tight">
                Chính sách vận chuyển
              </h1>
              <p className="mt-4 max-w-xl text-lg text-stone-600">
                Giao hàng nhanh chóng – An toàn – Uy tín
              </p>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-white/60 shadow-inner ring-1 ring-stone-200/60">
                <img
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80"
                  alt="Minh họa giao hàng và logistics"
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <Card icon="schedule" title="Thời gian giao hàng">
            <ul className="list-disc space-y-2 pl-4 marker:text-[#6B5344]">
              <li>Nội thành: 1 – 2 ngày</li>
              <li>Ngoại tỉnh: 2 – 5 ngày</li>
            </ul>
            <p className="mt-3 text-xs text-stone-500 italic">
              Thời gian có thể thay đổi tùy khu vực
            </p>
          </Card>

          <Card icon="local_shipping" title="Phí vận chuyển">
            <ul className="list-disc space-y-2 pl-4 marker:text-[#6B5344]">
              <li>Miễn phí đơn từ 300.000đ</li>
              <li>Đơn dưới 300.000đ: 25.000đ</li>
            </ul>
          </Card>

          <Card icon="map" title="Khu vực giao hàng">
            <p className="mb-3">Giao hàng toàn quốc.</p>
            <div className="flex flex-col items-center justify-center rounded-xl bg-[#6B5344]/5 py-6 text-[#6B5344]">
              <span className="material-symbols-outlined text-[52px] font-light" aria-hidden>
                map
              </span>
              <span className="mt-1 text-xs font-medium text-stone-500">
                63 tỉnh thành
              </span>
            </div>
          </Card>

          <Card icon="inventory_2" title="Đơn vị vận chuyển">
            <ul className="list-disc space-y-2 pl-4 marker:text-[#6B5344]">
              <li>Giao Hàng Nhanh (GHN)</li>
              <li>Giao Hàng Tiết Kiệm (GHTK)</li>
              <li>Viettel Post</li>
            </ul>
          </Card>

          <Card icon="task_alt" title="Lưu ý khi nhận hàng">
            <ul className="list-disc space-y-2 pl-4 marker:text-[#6B5344]">
              <li>Kiểm tra hàng trước khi thanh toán</li>
              <li>Không nhận nếu sản phẩm lỗi hoặc sai</li>
            </ul>
          </Card>
        </section>

        {/* Bottom bar */}
        <section className="mt-10 rounded-3xl border border-stone-200/90 bg-white px-6 py-8 shadow-sm md:px-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <Feature icon="headset_mic" title="Hỗ trợ 24/7" subtitle="Tư vấn nhanh chóng" />
            <Feature icon="verified_user" title="Đóng gói cẩn thận" subtitle="Bảo vệ sản phẩm" />
            <Feature icon="search" title="Theo dõi đơn hàng" subtitle="Cập nhật liên tục" />
            <Feature icon="thumb_up" title="Cam kết uy tín" subtitle="Đổi trả dễ dàng" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default ShippingPolicyPage;
