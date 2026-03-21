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

const Product = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && user?.token);

  const [wishlist, setWishlist] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [added, setAdded] = useState(false);

  // LOAD WISHLIST
  useEffect(() => {
    if (!product) return;

    const saved = JSON.parse(localStorage.getItem("wishlist")) || [];
    if (saved.includes(product._id)) {
      setWishlist(true);
    }
  }, [product]);

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
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='28' font-family='Arial'>No Image</text></svg>";
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
  const toggleWishlist = () => {
    const saved = JSON.parse(localStorage.getItem("wishlist")) || [];
    let updated;

    if (wishlist) {
      updated = saved.filter((id) => id !== product._id);
    } else {
      updated = [...saved, product._id];
    }

    localStorage.setItem("wishlist", JSON.stringify(updated));
    setWishlist(!wishlist);
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
      <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition duration-300 overflow-hidden relative">
        {/* IMAGE */}
        <Link to={`/product/${product._id}`}>
          <div className="relative h-[260px] overflow-hidden">
            <img
              src={image1}
              alt={product.name}
              className="absolute w-full h-full object-cover transition duration-300 ease-out group-hover:opacity-0 group-hover:-translate-y-1 group-hover:scale-105 active:scale-95"
              onError={onImageError}
            />

            <img
              src={image2}
              alt={product.name}
              className="w-full h-full object-cover opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-hover:-translate-y-1 group-hover:scale-105 active:scale-95"
              onError={onImageError}
            />

            {product?.sold > 50 && (
              <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                🔥 Best Seller
              </span>
            )}
          </div>
        </Link>

        {/* WISHLIST */}
        <button
          onClick={toggleWishlist}
          className="absolute top-3 right-3 bg-white p-2 rounded-full shadow hover:scale-110 transition"
        >
          {wishlist ? (
            <FaHeart className="text-red-500" />
          ) : (
            <FaRegHeart className="text-gray-500" />
          )}
        </button>

        {/* QUICK VIEW */}
        <button
          onClick={() => setShowQuickView(true)}
          className="absolute bottom-3 right-3 bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
        >
          <FaEye />
        </button>

        {/* INFO */}
        <div className="p-4">
          <Link to={`/product/${product._id}`}>
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px] group-hover:text-red-500">
              {product.name}
            </h3>
          </Link>

          {/* RATING */}
          <div className="flex items-center mt-1 text-yellow-400 text-xs">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                className={i < (product.rating || 4) ? "" : "text-gray-300"}
              />
            ))}

            <span className="text-gray-500 ml-1">({product.rating || 4})</span>
          </div>

          {/* PRICE */}
          <div className="mt-2">
            <span className="text-red-500 font-bold text-lg">
              {hasVariants
                ? minPrice === maxPrice
                  ? `${minPrice.toLocaleString()}đ`
                  : `Giá ${minPrice.toLocaleString()}đ - ${maxPrice.toLocaleString()}đ`
                : `${(product.price ?? minPrice ?? 0).toLocaleString()}đ`}
            </span>
          </div>
        </div>

        {/* ADD CART */}
        <div className="px-4 pb-4 ">
          <button
            onClick={handleAddCart}
            className={`w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg shadow-md transition ${
              added ? "bg-green-500" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            <FaShoppingCart />
            {hasVariants ? "Chọn size" : added ? "Đã thêm" : "Thêm vào giỏ hàng"}
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
