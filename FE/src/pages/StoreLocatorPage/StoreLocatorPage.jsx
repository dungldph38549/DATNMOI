import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const sage = "text-convot-sage";
const sageBg = "bg-convot-sage";
const sageHover = "hover:bg-[#7a9680]";

/** Dự phòng — Converse đen trắng (All Star) */
const IMG_FALLBACK =
  "https://images.unsplash.com/photo-1680204101108-d1bf3a7c725d?auto=format&fit=crop&w=1200&q=85";

/**
 * Toàn bộ ảnh Unsplash gắn chủ đề Converse / Chuck Taylor (Sneaker Converse).
 * Khác nhau từng ảnh — không dùng ảnh giày chạy / thương hiệu khác.
 */
const HERO_IMG =
  "https://images.unsplash.com/photo-1527128296579-fce16948f060?auto=format&fit=crop&w=1400&q=85";

const BRANCHES = [
  {
    id: 1,
    name: "Chi nhánh 1",
    address: "115 Lê Văn Sỹ, Quận 3, TP. HCM",
    hours: "Giờ mở cửa từ 9h00 - 21h00",
    query: "lê văn sỹ hcm",
    image:
      "https://images.unsplash.com/photo-1645740369993-c266df18eec1?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 2,
    name: "Chi nhánh 2",
    address: "88 Nguyễn Trãi, Quận Thanh Xuân, Hà Nội",
    hours: "Giờ mở cửa từ 9h00 - 21h00",
    query: "nguyễn trãi hà nội",
    image:
      "https://images.unsplash.com/photo-1578986175247-7d60c6df07c5?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 3,
    name: "Chi nhánh 3",
    address: "22 Trần Phú, Quận Hải Châu, Đà Nẵng",
    hours: "Giờ mở cửa từ 9h00 - 21h00",
    query: "đà nẵng",
    image:
      "https://images.unsplash.com/photo-1556048219-bb6978360b84?auto=format&fit=crop&w=1200&q=85",
  },
];

function BranchImage({ src, alt }) {
  const [current, setCurrent] = useState(src);
  useEffect(() => {
    setCurrent(src);
  }, [src]);
  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer-when-downgrade"
      onError={() => setCurrent(IMG_FALLBACK)}
      className="h-full w-full object-cover object-center"
    />
  );
}

const SERVICE_ITEMS = [
  { icon: "support_agent", title: "Hỗ trợ 24/7", sub: "Kết nối nhanh chóng" },
  { icon: "local_shipping", title: "Giao hàng tận nơi", sub: "Tới tay nhanh chóng" },
  { icon: "verified_user", title: "Cam kết chính hãng", sub: "Bảo hành đầy đủ" },
  { icon: "sync_alt", title: "Đổi trả dễ dàng", sub: "Thủ tục linh hoạt" },
];

const ServiceBar = () => (
  <section className="mt-12 rounded-3xl border border-neutral-200/90 bg-[#f3f3f2] px-4 py-8 shadow-sm md:px-8">
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {SERVICE_ITEMS.map((item, i) => (
        <div
          key={item.title}
          className={`flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left ${i > 0 ? "lg:border-l lg:border-neutral-300/60 lg:pl-6" : ""}`}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-convot-sage/15 text-convot-sage">
            <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
          </span>
          <div>
            <p className="font-display text-sm font-bold text-neutral-900">{item.title}</p>
            <p className="text-xs text-neutral-600">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const StoreLocatorPage = () => {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return BRANCHES;
    return BRANCHES.filter(
      (b) =>
        b.address.toLowerCase().includes(s) ||
        b.name.toLowerCase().includes(s) ||
        b.query.includes(s),
    );
  }, [q]);

  const mapsSearchHref = (query) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className="min-h-screen bg-convot-cream pb-16 pt-8 font-body md:pt-12">
      <div className="container mx-auto max-w-7xl px-4">
        <nav className="mb-8 text-sm text-neutral-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className={`${sage} transition-colors hover:underline`}>
                Trang chủ
              </Link>
            </li>
            <li className="text-neutral-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-neutral-700">Hệ thống cửa hàng</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white px-6 py-10 shadow-sm md:px-10 md:py-12">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-800 md:text-4xl lg:text-[2.2rem] lg:leading-tight">
                Hệ thống <span className={sage}>cửa hàng</span>
              </h1>
              <p className="mt-3 max-w-lg text-base text-neutral-600 md:text-lg">
                Tìm địa chỉ cửa hàng gần bạn nhất
              </p>
              <div className="mt-4 h-1 w-14 rounded-full bg-convot-sage" aria-hidden />

              <form
                className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
                onSubmit={(e) => e.preventDefault()}
              >
                <label className="sr-only" htmlFor="store-search">
                  Tìm tỉnh, thành phố
                </label>
                <div className="flex min-h-[52px] flex-1 items-center gap-3 rounded-full border border-neutral-200 bg-neutral-50/80 px-5 shadow-inner focus-within:border-convot-sage/40 focus-within:ring-2 focus-within:ring-convot-sage/15">
                  <span className="material-symbols-outlined text-neutral-400" aria-hidden>
                    search
                  </span>
                  <input
                    id="store-search"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nhập tỉnh, thành phố cần tìm..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                  />
                </div>
                <button
                  type="submit"
                  className={`inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-full px-8 text-sm font-bold text-white shadow-md transition ${sageBg} ${sageHover}`}
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  Tìm kiếm
                </button>
              </form>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-neutral-200/70">
                <img
                  src={HERO_IMG}
                  alt="Sneaker Converse — Converse Chuck Taylor All Star"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Cửa hàng + bản đồ */}
        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filtered.map((b) => (
            <article
              key={b.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-md shadow-neutral-900/5"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                <BranchImage src={b.image} alt={`${b.name} — Sneaker Converse`} />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-lg font-bold text-neutral-900">{b.name}</h2>
                <p className="mt-3 flex gap-2 text-sm text-neutral-600">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-convot-sage text-[18px]">
                    location_on
                  </span>
                  <span>{b.address}</span>
                </p>
                <p className="mt-2 flex gap-2 text-sm text-neutral-600">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-convot-sage text-[18px]">
                    schedule
                  </span>
                  <span>{b.hours}</span>
                </p>
                <a
                  href={mapsSearchHref(b.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-5 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition ${sageBg} ${sageHover}`}
                >
                  <span className="material-symbols-outlined text-[18px]">near_me</span>
                  Chỉ đường
                </a>
              </div>
            </article>
          ))}

          <div className="flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-[#f5f0e8] shadow-md shadow-neutral-900/5 md:min-h-[320px] xl:min-h-0">
            <div className="relative flex-1 min-h-[220px]">
              <iframe
                title="Bản đồ cửa hàng"
                className="absolute inset-0 h-full w-full border-0 grayscale-[20%] contrast-[0.95]"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=106.62%2C10.72%2C106.78%2C10.84&layer=mapnik"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-convot-sage/10 to-transparent" />
            </div>
            <div className="border-t border-neutral-200/80 bg-white/90 px-4 py-3 text-center text-xs text-neutral-600">
              Bản đồ minh họa — các chi nhánh trên lưới thẻ
            </div>
          </div>
        </section>

        {filtered.length === 0 && (
          <p className="mt-6 text-center text-sm text-neutral-600">
            Không tìm thấy cửa hàng phù hợp. Thử từ khóa khác hoặc xóa ô tìm kiếm.
          </p>
        )}

        <ServiceBar />
      </div>
    </div>
  );
};

export default StoreLocatorPage;
