import React, { useState, useMemo } from "react";
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
import { getProductPriceInfo } from "../../utils/pricing";
import notify from "../../utils/notify";
import { getStocks } from "../../api";

const Product = ({ product, ratingValue }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const cartItems = useSelector((state) => state.cart.items || []);
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

  const cardPriceInfo = useMemo(() => getProductPriceInfo(product), [product]);

  const { minOriginal, maxOriginal } = useMemo(() => {
    const or = product?.originalPriceRange;
    if (or && (or.min != null || or.max != null)) {
      return {
        minOriginal: Number(or.min ?? 0) || 0,
        maxOriginal: Number(or.max ?? or.min ?? 0) || 0,
      };
    }
    const o = Number(cardPriceInfo.originalPrice ?? 0);
    return { minOriginal: o, maxOriginal: o };
  }, [product, cardPriceInfo.originalPrice]);

  const ratingOutOf5 = useMemo(() => {
    let raw;
    if (ratingValue !== undefined && ratingValue !== null) {
      raw = Number(ratingValue);
    } else {
      raw = Number(product?.rating);
    }
    if (!Number.isFinite(raw)) return { value: 4, label: "4/5" };
    const v = Math.min(5, Math.max(0, raw));
    const label = v % 1 === 0 ? `${Math.round(v)}/5` : `${v.toFixed(1)}/5`;
    return { value: v, label };
  }, [ratingValue, product?.rating]);

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

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleWishlist(product));
  };

  const handleAddCart = async () => {
    if (!isLoggedIn) {
      notify.warning("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
      navigate("/login", { state: { from: `/product/${product?._id || ""}` } });
      return;
    }

    if (hasVariants) {
      navigate(`/product/${product._id}`);
      return;
    }

    let maxStock = 0;
    try {
      const res = await getStocks([{ productId: product._id }]);
      const row = Array.isArray(res) ? res[0] : null;
      maxStock = Number(row?.countInStock ?? 0);
    } catch {
      notify.warning("Không kiểm tra được tồn kho. Thử lại sau.");
      return;
    }

    const alreadyInCart = cartItems.reduce((sum, i) => {
      if (String(i.productId) !== String(product._id)) return sum;
      const iSku =
        i.sku == null || String(i.sku).trim() === ""
          ? null
          : String(i.sku).trim().toUpperCase();
      if (iSku != null) return sum;
      return sum + Number(i.qty || 0);
    }, 0);

    const remaining = Math.max(0, maxStock - alreadyInCart);
    if (remaining <= 0) {
      notify.warning(
        maxStock <= 0
          ? "Sản phẩm đã hết, vui lòng mua sản phẩm khác."
          : "Đã đạt số lượng tối đa trong kho.",
      );
      return;
    }

    const safePrice = Number(cardPriceInfo.effectivePrice ?? product?.price ?? minPrice ?? 0) || 0;
    dispatch(
      addToCart({
        productId: product._id,
        name: product.name,
        price: safePrice,
        originalPrice: Number(cardPriceInfo.originalPrice || safePrice),
        image: product.image,
        qty: 1,
      }),
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50/30 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(79,70,229,0.18)] hover:ring-primary/15 italic-none">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-gradient-to-r from-primary/0 via-primary/70 to-secondary/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        <Link to={`/product/${product._id}`} className="relative block aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
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

          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          {product?.sold > 50 && (
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-md shadow-orange-500/25">
                🔥 Hot
              </span>
            </div>
          )}

          {cardPriceInfo.hasSale && (
            <div className="absolute top-3 left-3 z-10 translate-y-7">
              <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-md">
                -{cardPriceInfo.discountPercent}%
              </span>
            </div>
          )}

          <div className="absolute inset-0 z-20 flex translate-y-4 items-center justify-center opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowQuickView(true);
              }}
              className="rounded-full bg-white/95 p-3.5 text-slate-800 shadow-xl shadow-slate-900/10 backdrop-blur-md transition-all hover:scale-105 hover:bg-primary hover:text-white"
              aria-label="Xem nhanh"
            >
              <FaEye size={18} />
            </button>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleToggleWishlist}
          className="absolute right-3 top-3 z-30 rounded-full bg-white/90 p-2.5 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/60 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
          aria-label={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
        >
          {isFavorited ? (
            <FaHeart className="text-red-500" />
          ) : (
            <FaRegHeart className="text-slate-400 group-hover:text-red-400" />
          )}
        </button>

        <div className="flex flex-1 flex-col p-5">
          <Link to={`/product/${product._id}`}>
            <h3 className="mb-2 line-clamp-2 min-h-[40px] font-display text-sm font-semibold leading-snug text-slate-800 transition-colors group-hover:text-primary">
              {product.name}
            </h3>
          </Link>

          <div className="mb-3 flex items-center text-[11px] text-amber-400">
            <div className="mr-1.5 flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  className={i < Math.round(ratingOutOf5.value) ? "drop-shadow-sm" : "text-slate-200"}
                />
              ))}
            </div>
            <span className="text-slate-400 font-medium tabular-nums">({ratingOutOf5.label})</span>
          </div>

          <div className="mb-5 flex-1 flex flex-col justify-end">
            <div className="flex flex-wrap items-baseline gap-1.5">
              {hasVariants && minPrice !== maxPrice ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider leading-none">
                    Giá từ
                  </span>
                  {cardPriceInfo.hasSale && minOriginal > 0 && (
                    <span className="text-slate-400 line-through text-sm font-medium leading-none tabular-nums">
                      {minOriginal === maxOriginal
                        ? `${minOriginal.toLocaleString("vi-VN")}₫`
                        : `${minOriginal.toLocaleString("vi-VN")}₫ – ${maxOriginal.toLocaleString("vi-VN")}₫`}
                    </span>
                  )}
                  <span className="text-primary font-bold text-lg leading-none tabular-nums">
                    {minPrice.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {cardPriceInfo.hasSale && (
                    <span className="text-slate-400 line-through text-sm font-medium leading-none tabular-nums">
                      {cardPriceInfo.originalPrice.toLocaleString("vi-VN")}₫
                    </span>
                  )}
                  <span className="text-primary font-bold text-xl leading-none tabular-nums">
                    {cardPriceInfo.effectivePrice.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddCart}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 active:scale-[0.98] ${
              added
                ? "bg-emerald-500 shadow-emerald-500/30"
                : "bg-gradient-to-r from-slate-900 to-slate-800 shadow-slate-900/20 hover:from-primary hover:to-indigo-600 hover:shadow-primary/25"
            }`}
          >
            {added ? <FaShoppingCart /> : null}
            <span className="uppercase tracking-wide">
              {hasVariants ? "Chọn kích cỡ" : added ? "Đã thêm" : "Thêm vào giỏ"}
            </span>
          </button>
        </div>
      </div>

      {showQuickView && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-200/50">
            <button
              type="button"
              onClick={() => setShowQuickView(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-md ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Đóng"
            >
              ✕
            </button>

            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
              <img
                src={image1}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={onImageError}
              />
            </div>

            <div className="p-6">
              <h3 id="quick-view-title" className="font-display text-lg font-bold text-slate-900">
                {product.name}
              </h3>

              <div className="mt-2 flex flex-col gap-1">
                {cardPriceInfo.hasSale && minOriginal > 0 && (
                  <span className="font-display text-base font-semibold text-slate-400 line-through tabular-nums">
                    {hasVariants && minPrice !== maxPrice
                      ? minOriginal === maxOriginal
                        ? `${minOriginal.toLocaleString("vi-VN")}₫`
                        : `${minOriginal.toLocaleString("vi-VN")}₫ – ${maxOriginal.toLocaleString("vi-VN")}₫`
                      : `${cardPriceInfo.originalPrice.toLocaleString("vi-VN")}₫`}
                  </span>
                )}
                <p className="font-display text-xl font-bold text-primary tabular-nums">
                  {hasVariants
                    ? minPrice === maxPrice
                      ? `${minPrice.toLocaleString("vi-VN")}₫`
                      : `${minPrice.toLocaleString("vi-VN")}₫ – ${maxPrice.toLocaleString("vi-VN")}₫`
                    : `${cardPriceInfo.effectivePrice.toLocaleString("vi-VN")}₫`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddCart}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:from-indigo-600 hover:to-primary"
              >
                {hasVariants ? "Chọn size" : "Thêm vào giỏ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Product;