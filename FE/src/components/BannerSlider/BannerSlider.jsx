import React, { useEffect, useMemo, useState } from "react";
import { getPublicBanners } from "../../api";

const FALLBACK_BANNERS = [
  {
    _id: "fallback-1",
    title: "SneakerHouse",
    subtitle: "Giay hot, gia tot moi ngay",
    image:
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=85&w=2000&auto=format&fit=crop",
    link: "/product",
  },
];

const toLink = (value) => {
  const s = String(value || "").trim();
  if (!s) return "/";
  return s;
};

export default function BannerSlider() {
  const [items, setItems] = useState(FALLBACK_BANNERS);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getPublicBanners();
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (!mounted) return;
        setItems(rows.length > 0 ? rows : FALLBACK_BANNERS);
      } catch {
        if (mounted) setItems(FALLBACK_BANNERS);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const total = items.length;
  const current = useMemo(() => items[index] || FALLBACK_BANNERS[0], [items, index]);

  useEffect(() => {
    if (total <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [total]);

  const goPrev = () => setIndex((prev) => (prev - 1 + total) % total);
  const goNext = () => setIndex((prev) => (prev + 1) % total);

  return (
    <section className="px-4 pt-6 md:pt-10 max-w-7xl mx-auto font-['Lexend']">
      <div className="relative overflow-hidden rounded-[12px] md:rounded-[16px] min-h-[340px] md:min-h-[460px]">
        {items.map((b, i) => (
          <a
            href={toLink(b.link)}
            key={b._id || i}
            className={`absolute inset-0 block transition-opacity duration-700 ${i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
          >
            <img
              src={b.image}
              alt={b.title || "banner"}
              loading="lazy"
              className="w-full h-full object-cover min-h-[340px] md:min-h-[460px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
            <div className="absolute left-5 right-5 bottom-6 md:left-10 md:bottom-10 text-white">
              <h2 className="text-2xl md:text-4xl font-bold leading-tight">{b.title}</h2>
              <p className="mt-2 text-sm md:text-base opacity-95">{b.subtitle}</p>
            </div>
          </a>
        ))}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 hover:bg-white text-neutral-800"
              aria-label="Banner truoc"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 hover:bg-white text-neutral-800"
              aria-label="Banner sau"
            >
              ›
            </button>
            <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
              {items.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all ${i === index ? "w-8 bg-[#f49d25]" : "w-2.5 bg-white/70"}`}
                  aria-label={`Den banner ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
