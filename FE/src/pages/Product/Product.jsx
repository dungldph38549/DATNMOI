import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";

const getProductImageUrl = (p) => {
  const candidate = (typeof p?.image === "string" && p.image.trim()) || (Array.isArray(p?.srcImages) && typeof p.srcImages[0] === "string" ? p.srcImages[0].trim() : "");
  if (!candidate) return PLACEHOLDER_IMG;
  if (candidate.startsWith("http")) return candidate;
  return `http://localhost:3002/uploads/${candidate.startsWith("/") ? candidate.slice(1) : candidate}`;
};

const getDisplayPrice = (p) => {
  const singlePrice = Number(p?.price);
  return Number.isFinite(singlePrice) ? `${singlePrice.toLocaleString("vi-VN")}đ` : "Liên hệ";
};

const Product = ({ product }) => {
  const p = product;
  const isHot = p.soldCount > 50;

  return (
    <Link to={`/product/${p._id}`} className="group relative rounded-3xl bg-surface overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 border border-slate-100 flex flex-col h-[400px]">
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
        <img
          src={getProductImageUrl(p)}
          alt={p.name}
          onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; }}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {isHot && <span className="bg-secondary text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md shadow-lg shadow-secondary/30">Hot Drop</span>}
          {p.isNew && <span className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md shadow-lg shadow-primary/30">New</span>}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 bg-surface z-20">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{p.brandId?.name || "Premium"}</p>
        <h3 className="font-display font-bold text-lg text-slate-800 leading-snug line-clamp-2 mb-4 group-hover:text-primary transition-colors">{p.name}</h3>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-secondary font-black text-xl">{getDisplayPrice(p)}</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <FaArrowRight size={14} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default Product;
