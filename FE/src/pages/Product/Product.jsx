import React from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='28' font-family='Arial'>No Image</text></svg>";
const getProductImageUrl = (p) => {
  const candidate =
    (typeof p?.image === "string" && p.image.trim()) ||
    (Array.isArray(p?.srcImages) && typeof p.srcImages[0] === "string"
      ? p.srcImages[0].trim()
      : "");
  if (!candidate) return PLACEHOLDER_IMG;
  if (candidate.startsWith("http://") || candidate.startsWith("https://"))
    return candidate;
  if (candidate.startsWith("/uploads/")) return `http://localhost:3002${candidate}`;
  if (candidate.startsWith("uploads/")) return `http://localhost:3002/${candidate}`;
  return `http://localhost:3002/uploads/${candidate}`;
};

const Product = ({ product }) => {
  const dispatch = useDispatch();

  const sale = Math.floor(Math.random() * 30) + 10;
  const sold = Math.floor(Math.random() * 500);
  const oldPrice = Math.floor(product.price + (product.price * sale) / 100);
  const imageUrl = getProductImageUrl(product);
  const onImgError = (e) => {
    e.target.onerror = null;
    e.target.src = PLACEHOLDER_IMG;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden group relative hover:-translate-y-2">
      {/* SALE BADGE */}
      <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10 shadow">
        -{sale}%
      </span>

      {/* IMAGE */}
      <Link to={`/product/${product._id}`}>
        <div className="h-72 bg-gray-100 flex items-center justify-center overflow-hidden relative">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-[260px] object-cover rounded-lg"
            onError={onImgError}
          />

          {/* OVERLAY */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition" />
        </div>
      </Link>

      {/* HOVER ACTION */}
      <div className="absolute bottom-16 left-0 w-full flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() =>
            dispatch(
              addToCart({
                productId: product._id,
                name: product.name,
                image: product.image,
                price: product.price,
                qty: 1,
              }),
            )
          }
          className="bg-black text-white text-xs px-4 py-2 rounded-full hover:bg-red-500 transition shadow"
        >
          Add Cart
        </button>

        <Link
          to={`/product/${product._id}`}
          className="bg-white text-xs px-3 py-2 rounded-full shadow hover:bg-gray-100 transition"
        >
          View
        </Link>
      </div>

      {/* CONTENT */}
      <div className="p-4">
        {/* NAME */}
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[36px]">
          {product.name}
        </h3>

        {/* RATING */}
        <div className="flex items-center text-yellow-400 text-xs mt-1">
          ★★★★★
          <span className="text-gray-400 ml-2">(120)</span>
        </div>

        {/* PRICE */}
        <div className="flex items-center gap-2 mt-2">
          <p className="text-red-500 font-bold text-base">${product.price}</p>

          <p className="text-gray-400 line-through text-xs">${oldPrice}</p>
        </div>

        {/* SOLD BAR */}
        <div className="mt-2">
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 h-full"
              style={{ width: `${Math.min(sold / 5, 100)}%` }}
            />
          </div>

          <p className="text-xs text-gray-400 mt-1">🔥 {sold} sold</p>
        </div>
      </div>
    </div>
  );
};

export default Product;
