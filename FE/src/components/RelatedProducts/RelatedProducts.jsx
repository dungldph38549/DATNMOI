import React from "react";
import { Link } from "react-router-dom";
import { getProductPriceInfo } from "../../utils/pricing";

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";

const getImage = (img) => {
  if (!img || typeof img !== "string") return PLACEHOLDER_IMG;
  if (img.startsWith("http")) return img;
  return `http://localhost:3002/uploads/${img.startsWith("/") ? img.slice(1) : img}`;
};

export default function RelatedProducts({
  products = [],
  loading = false,
  title = "Sản phẩm gợi ý cho bạn",
}) {
  return (
    <div className="mb-20">
      <h2 className="text-3xl font-display font-black text-slate-900 mb-8 flex items-center gap-4">
        {title}
        <div className="flex-1 h-px bg-slate-200" />
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {(products || []).slice(0, 4).map((p) => {
            const img = p?.image || p?.srcImages?.[0] || "";
            const priceInfo = getProductPriceInfo(p);
            return (
              <Link
                key={p._id}
                to={`/product/${p._id}`}
                className="group bg-white rounded-3xl border border-slate-100 p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden flex items-center justify-center p-2 relative">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                  <img
                    src={getImage(img)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors mb-2">
                    {p.name}
                  </h3>
                  <div>
                    {priceInfo.hasSale && (
                      <p className="text-xs text-slate-400 line-through">
                        {Number(priceInfo.originalPrice).toLocaleString("vi-VN")}₫
                      </p>
                    )}
                    <p className="font-black text-secondary">
                      {Number(priceInfo.effectivePrice).toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
