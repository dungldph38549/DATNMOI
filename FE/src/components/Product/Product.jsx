import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaStar,
  FaShoppingCart,
  FaHeart,
  FaRegHeart,
  FaEye,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";

const Product = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const isLoggedIn = !!(user?.login && user?.token);

  const isFavorited = useMemo(() => {
    return wishlistItems.some((item) => item._id === product?._id);
  }, [wishlistItems, product?._id]);

  const [showQuickView, setShowQuickView] = useState(false);
  const [added, setAdded] = useState(false);


  // Back-end đôi khi không set `hasVariants` đúng như `variants` thực có.
  // Vì vậy suy ra biến thể dựa trên `variants.length`.
  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;

  const { minPrice, maxPrice } = useMemo(() => {
    const pr = product?.priceRange;
    if (pr && (pr.min != null || pr.max != null)) {
      return {
        minPrice: Number(pr.min ?? product?.price ?? 0) || 0,
        maxPrice: Number(pr.max ?? product?.price ?? 0) || 0,
      };
    }

    const prices = Array.isArray(product?.variants)
      ? product.variants
        .filter((v) => v && v.price != null)
        .map((v) => Number(v.price))
        .filter((n) => Number.isFinite(n))
      : [];

    if (prices.length > 0) {
      return { minPrice: Math.min(...prices), maxPrice: Math.max(...prices) };
    }

    const single = Number(product?.price ?? 0);
    return {
      minPrice: Number.isFinite(single) ? single : 0,
      maxPrice: Number.isFinite(single) ? single : 0,
    };
  }, [product]);

  if (!product) return null;

  const PLACEHOLDER =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";
  const getImageUrl = (img) => {
    if (!img || typeof img !== "string") return PLACEHOLDER;
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    if (img.startsWith("/uploads/")) return `http://localhost:3002${img}`;
    if (img.startsWith("uploads/")) return `http://localhost:3002/${img}`;
    return `http://localhost:3002/uploads/${img}`;
  };
  const image1 = getImageUrl(product.image || product?.srcImages?.[0]);
  const image2 = getImageUrl(product.image2 || product?.srcImages?.[1]) || image1;

  const onImageError = (e) => {
    e.target.onerror = null;
    e.target.src = PLACEHOLDER;
  };

  // WISHLIST
  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleWishlist(product));
  };

  // ADD CART
  const handleAddCart = () => {
    if (!isLoggedIn) {
      alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
      navigate("/login", { state: { from: `/product/${product?._id || ""}` } });
      return;
    }

    if (hasVariants) {
      // Có biến thể (size/SKU) thì bắt buộc chọn ở trang chi tiết.
      navigate(`/product/${product._id}`);
      return;
    }

    const safePrice = Number(product?.price ?? minPrice ?? 0) || 0;
    dispatch(
      addToCart({
        productId: product._id,
        name: product.name,
        price: safePrice,
        image: product.image,
        qty: 1,
      }),
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      <div className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden relative flex flex-col h-full border border-slate-100 italic-none">
        {/* IMAGE */}
        <Link to={`/product/${product._id}`} className="block relative aspect-square overflow-hidden bg-slate-50">
          <img
            src={image1}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:opacity-0"
            onError={onImageError}
          />

          <img
            src={image2}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-110"
            onError={onImageError}
          />

          {/* OPTIONAL LIGHT OVERLAY ON HOVER */}
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          {product?.sold > 50 && (
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-orange-500/30">
                🔥 Hot
              </span>
            </div>
          )}

          {/* QUICK VIEW ICON (Centered) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 translate-y-4 group-hover:translate-y-0">
            <button
              onClick={(e) => { e.preventDefault(); setShowQuickView(true); }}
              className="bg-white/90 backdrop-blur-md text-slate-900 p-4 rounded-full shadow-2xl hover:bg-primary hover:text-white transition-all transform hover:scale-110"
            >
              <FaEye size={20} />
            </button>
          </div>
        </Link>

        {/* WISHLIST (Floating) */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 z-30 bg-white/80 backdrop-blur-sm p-2.5 rounded-full shadow-md hover:shadow-xl hover:scale-110 transition-all duration-300"
        >
          {isFavorited ? (
            <FaHeart className="text-red-500" />
          ) : (
            <FaRegHeart className="text-slate-400 group-hover:text-red-400" />
          )}
        </button>

        {/* INFO */}
        <div className="p-5 flex flex-col flex-1">
          <Link to={`/product/${product._id}`}>
            <h3 className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[40px] mb-2 group-hover:text-primary transition-colors leading-tight">
              {product.name}
            </h3>
          </Link>

          {/* RATING */}
          <div className="flex items-center mb-3 text-yellow-400 text-[10px]">
            <div className="flex mr-1.5">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  className={i < (product.rating || 4) ? "drop-shadow-sm" : "text-slate-200"}
                />
              ))}
            </div>
            <span className="text-slate-400 font-bold">({product.rating || 4})</span>
          </div>

          {/* PRICE SECTON (Flexible height to keep buttons aligned) */}
          <div className="mb-5 flex-1 flex flex-col justify-end">
            <div className="flex flex-wrap items-baseline gap-1.5">
              {hasVariants && minPrice !== maxPrice ? (
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Giá từ</span>
                  <span className="text-primary font-black text-lg leading-none">
                    {minPrice.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              ) : (
                <span className="text-primary font-black text-xl leading-none">
                  {(product.price ?? minPrice ?? 0).toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>
          </div>

          {/* ADD CART BUTTON (Aligned at bottom) */}
          <button
            onClick={handleAddCart}
            className={`w-full flex items-center justify-center gap-2 text-white text-sm font-black py-3.5 rounded-xl shadow-lg transition-all duration-300 transform active:scale-95 ${added
                ? "bg-green-500 shadow-green-500/20"
                : "bg-slate-900 hover:bg-primary shadow-slate-900/20 hover:shadow-primary/30"
              }`}
          >
            {added ? <FaShoppingCart /> : null}
            <span className="uppercase tracking-widest">
              {hasVariants ? "Chọn kích cỡ" : added ? "Đã thêm" : "Thêm vào giỏ"}
            </span>
          </button>
        </div>
      </div>

      {/* QUICK VIEW MODAL */}
      {showQuickView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[420px] relative">
            <button
              onClick={() => setShowQuickView(false)}
              className="absolute top-3 right-3 text-gray-500 text-lg"
            >
              ✕
            </button>

            <img
              src={image1}
              alt={product.name}
              className="w-full h-[240px] object-cover rounded"
              onError={onImageError}
            />

            <h3 className="font-bold text-lg mt-3">{product.name}</h3>

            <p className="text-red-500 text-xl font-bold mt-1">
              {hasVariants
                ? minPrice === maxPrice
                  ? `${minPrice.toLocaleString()}đ`
                  : `Giá ${minPrice.toLocaleString()}đ - ${maxPrice.toLocaleString()}đ`
                : `${(product.price ?? minPrice ?? 0).toLocaleString()}đ`}
            </p>

            <button
              onClick={handleAddCart}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
            >
              {hasVariants ? "Chọn size" : "Thêm vào giỏ"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Product;
