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
import { getProductPriceInfo, getProductPriceRange } from "../../utils/pricing.js";
import notify from "../../utils/notify";
import { isProductOutOfStock } from "../../utils/stock.js";

const Product = ({
  product,
  ratingValue,
  compactCartCta = false,
  hoverStyle = "default",
  showSalePercentBadge = true,
}) => {
  const isProductOnRealSale = useMemo(() => {
    const amount = (value) => Number(value) || 0;
    if (amount(product?.saleDiscountAmount) > 0) return true;
    if (
      Array.isArray(product?.variants) &&
      product.variants.some((variant) => amount(variant?.saleDiscountAmount) > 0)
    ) {
      return true;
    }
    return false;
  }, [product]);

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

  const hasVariants =
    Array.isArray(product?.variants) && product.variants.length > 0;
  const isOutOfStock = useMemo(() => isProductOutOfStock(product), [product]);

  const { minPrice, maxPrice } = useMemo(() => getProductPriceRange(product), [product]);

  const cardPriceInfo = useMemo(() => getProductPriceInfo(product), [product]);

  const ratingOutOf5 = useMemo(() => {
    let raw =
      ratingValue !== undefined && ratingValue !== null
        ? Number(ratingValue)
        : Number(product?.rating);

    if (!Number.isFinite(raw)) return { value: 4, label: "4/5" };

    const v = Math.min(5, Math.max(0, raw));
    const label = v % 1 === 0 ? `${Math.round(v)}/5` : `${v.toFixed(1)}/5`;
    return { value: v, label };
  }, [ratingValue, product?.rating]);

  if (!product) return null;

  const PLACEHOLDER =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='28'>No Image</text></svg>";

  const getImageUrl = (img) => {
    if (!img) return PLACEHOLDER;
    if (img.startsWith("http")) return img;
    return `http://localhost:3002/uploads/${img}`;
  };

  const image1 = getImageUrl(product.image);
  const image2 = getImageUrl(product.image2) || image1;

  const onImageError = (e) => {
    e.target.src = PLACEHOLDER;
  };

  const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString("vi-VN");
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleWishlist(product));
  };

  const handleAddCart = async () => {
    if (!isLoggedIn) {
      notify.warning("Vui lòng đăng nhập");
      navigate("/login");
      return;
    }

    if (isOutOfStock) {
      notify.warning("Sản phẩm đã hết hàng");
      return;
    }

    if (hasVariants) {
      navigate(`/product/${product._id}`);
      return;
    }

    dispatch(
      addToCart({
        productId: product._id,
        name: product.name,
        price: cardPriceInfo.effectivePrice,
        image: product.image,
        qty: 1,
      })
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const useCatalogHover = hoverStyle === "catalog";

  return (
    <div
      className={`group relative rounded-2xl bg-white transition ${
        useCatalogHover
          ? "overflow-hidden border border-neutral-100 shadow-sm hover:-translate-y-0.5 hover:shadow-lg"
          : "shadow hover:shadow-lg"
      }`}
    >
      <Link to={`/product/${product._id}`} className="block relative">
        <img
          src={image1}
          alt={product.name}
          onError={onImageError}
          className={`w-full h-60 object-cover transition duration-300 ${
            useCatalogHover ? "group-hover:scale-105" : ""
          }`}
        />
        {!isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md">
              <FaEye size={16} />
            </span>
          </div>
        )}
        {isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-black/65 px-3 text-center text-lg font-semibold text-white shadow-lg">
              Hết hàng
            </span>
          </div>
        )}

        {/* HOT */}
        {product?.sold > 50 && (
          <div className="absolute top-3 left-3">
            <span className="bg-orange-500 text-white px-2 py-1 text-xs rounded">
              🔥 Hot
            </span>
          </div>
        )}

        {/* SALE */}
        {cardPriceInfo.hasSale && isProductOnRealSale && showSalePercentBadge && (
          <div className="absolute top-10 left-3">
            <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">
              -{cardPriceInfo.discountPercent}%
            </span>
          </div>
        )}
      </Link>

      <div className="p-4">
        <h3 className="font-semibold text-sm">{product.name}</h3>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className={star <= Math.round(ratingOutOf5.value) ? "text-yellow-400" : "text-neutral-300"}
            />
          ))}
          <span className="ml-1 text-xs text-neutral-500">({ratingOutOf5.label})</span>
        </div>

        <div className="mt-2">
          <span className="text-red-500 font-bold">
            {minPrice === maxPrice
              ? `${formatPrice(minPrice)}₫`
              : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}₫`}
          </span>
        </div>

        {!compactCartCta && (
          <button
            onClick={handleAddCart}
            className={`mt-3 w-full py-2 rounded text-white ${
              isOutOfStock
                ? "cursor-not-allowed bg-neutral-400"
                : "bg-black"
            }`}
            disabled={isOutOfStock}
            aria-label={hasVariants ? "Chọn kích cỡ" : "Thêm vào giỏ"}
          >
            {isOutOfStock ? "Hết hàng" : added ? "Đã thêm" : "Thêm vào giỏ"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Product;