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
import { getProductPriceInfo } from "../../utils/pricing.js";
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

  const hasVariants =
    Array.isArray(product?.variants) && product.variants.length > 0;

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

  return (
    <div className="group relative rounded-2xl bg-white shadow hover:shadow-lg transition">
      <Link to={`/product/${product._id}`} className="block relative">
        <img
          src={image1}
          alt={product.name}
          onError={onImageError}
          className="w-full h-60 object-cover"
        />

        {/* HOT */}
        {product?.sold > 50 && (
          <div className="absolute top-3 left-3">
            <span className="bg-orange-500 text-white px-2 py-1 text-xs rounded">
              🔥 Hot
            </span>
          </div>
        )}

        {/* SALE */}
        {cardPriceInfo.hasSale && (
          <div className="absolute top-10 left-3">
            <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">
              -{cardPriceInfo.discountPercent}%
            </span>
          </div>
        )}
      </Link>

      <div className="p-4">
        <h3 className="font-semibold text-sm">{product.name}</h3>

        <div className="text-yellow-400 flex">
          {[...Array(5)].map((_, i) => (
            <FaStar key={i} />
          ))}
        </div>

        <div className="mt-2">
          {cardPriceInfo.hasSale && (
            <span className="line-through text-gray-400 mr-2">
              {cardPriceInfo.originalPrice}₫
            </span>
          )}
          <span className="text-red-500 font-bold">
            {cardPriceInfo.effectivePrice}₫
          </span>
        </div>

        <button
          onClick={handleAddCart}
          className="mt-3 w-full bg-black text-white py-2 rounded"
        >
          {added ? "Đã thêm" : "Thêm vào giỏ"}
        </button>
      </div>
    </div>
  );
};

export default Product;