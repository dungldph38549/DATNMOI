import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { getProductPriceInfo } from "../../utils/pricing";

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='22'>No Image</text></svg>";

const BADGE_STYLES = {
  forYou: { label: "Cho bạn", className: "bg-violet-100 text-violet-800" },
  bestseller: { label: "🔥 Bán chạy", className: "bg-orange-100 text-orange-900" },
  new: { label: "🆕 Mới về", className: "bg-emerald-100 text-emerald-900" },
  rating: { label: "⭐ Đánh giá cao", className: "bg-amber-100 text-amber-900" },
  hotsale: { label: "💥 Hot sale", className: "bg-rose-100 text-rose-900" },
};

const getImageSrc = (img) => {
  if (!img) return PLACEHOLDER;
  if (String(img).startsWith("http")) return img;
  return `http://localhost:3002/uploads/${String(img).replace(/^\//, "")}`;
};

/**
 * Thẻ sản phẩm gọn cho lưới gợi ý (SneakerHouse: Lexend, #f49d25, radius 12)
 */
export default function ProductCard({ product, badges = [] }) {
  const priceInfo = useMemo(() => getProductPriceInfo(product), [product]);
  const img = getImageSrc(product?.image || product?.srcImages?.[0]);
  const name = product?.name || "Sản phẩm";
  const id = product?._id;

  const badgeList = useMemo(() => {
    const raw = Array.isArray(badges) ? badges : [];
    const order = ["hotsale", "bestseller", "new", "rating", "forYou"];
    const sorted = [...new Set(raw)].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );
    return sorted.slice(0, 3);
  }, [badges]);

  if (!id) return null;

  return (
    <Link
      to={`/product/${id}`}
      className="group block h-full rounded-[12px] border border-neutral-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
      style={{ fontFamily: "'Lexend', system-ui, sans-serif" }}
    >
      <div className="relative aspect-[4/4.5] overflow-hidden bg-neutral-100">
        <img
          src={img}
          alt={name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = PLACEHOLDER;
          }}
        />
        {badgeList.length > 0 && (
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-12px)] flex-wrap gap-1">
            {badgeList.map((key) => {
              const cfg = BADGE_STYLES[key];
              if (!cfg) return null;
              return (
                <span
                  key={key}
                  className={`max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-bold shadow-sm ${cfg.className}`}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-neutral-900 group-hover:text-[#f49d25]">
          {name}
        </p>
        <p className="mt-1.5 text-sm font-bold tabular-nums text-[#f49d25]">
          {Number(priceInfo.effectivePrice ?? 0).toLocaleString("vi-VN")}đ
        </p>
      </div>
    </Link>
  );
}
