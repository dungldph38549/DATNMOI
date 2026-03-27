import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
import {
  addToCartAPI, createReview, getMyReviewByProduct, getOrdersByUser, getProductById,
  getProductRecommendations, getProductReviews, getStocks, trackViewedProduct, uploadImages
} from "../../api";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";
import { FaStar, FaShoppingCart, FaCheckCircle, FaShippingFast, FaShieldAlt, FaHeart, FaRegHeart } from "react-icons/fa";
import { getProductPriceInfo } from "../../utils/pricing";
import BackButton from "../../components/Common/BackButton";
import RelatedProducts from "../../components/RelatedProducts/RelatedProducts";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const isFavorited = wishlistItems.some((item) => item._id === id);

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeTab, setActiveTab] = useState("desc");
  const [mainImage, setMainImage] = useState("");

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsReload, setReviewsReload] = useState(0);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState("");

  const [checkingStock, setCheckingStock] = useState(false);
  const [stockInfo, setStockInfo] = useState(null);
  const [qtyNotice, setQtyNotice] = useState("");

  const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";

  const reviewFilePreviews = useMemo(() => reviewFiles.map((f) => URL.createObjectURL(f)), [reviewFiles]);
  useEffect(() => {
    return () => { reviewFilePreviews.forEach((url) => URL.revokeObjectURL(url)); };
  }, [reviewFilePreviews]);

  const getImage = (img) => {
    if (!img) return PLACEHOLDER_IMG;
    if (typeof img !== "string") return PLACEHOLDER_IMG;
    if (img.startsWith("http")) return img;
    return `http://localhost:3002/uploads/${img.startsWith("/") ? img.slice(1) : img}`;
  };

  const getVariantSizeValue = useCallback((variant) => {
    const attrs = variant?.attributes;
    if (!attrs) return null;
    if (typeof attrs.get === "function") return attrs.get("Size") ?? attrs.get("size") ?? attrs.get("SIZE") ?? null;
    if (typeof attrs === "object") {
      if (attrs.Size != null) return attrs.Size;
      if (attrs.size != null) return attrs.size;
      const foundKey = Object.keys(attrs).find((k) => String(k).toLowerCase() === "size");
      if (foundKey) return attrs[foundKey];
    }
    return null;
  }, []);

  const getVariantSizeLabel = useCallback((variant) => {
    const val = getVariantSizeValue(variant);
    return val != null ? String(val) : variant?.sku ?? "";
  }, [getVariantSizeValue]);

  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        const p = data?.data ?? data;
        setProduct(p);
        setMainImage(p?.image || p?.srcImages?.[0] || "");
      } catch (err) {
        setProduct(null);
      }
    };
    fetchProduct();
  }, [id]);

  const availableSizes = useMemo(() => {
    if (!product || !hasVariants) return [];
    const labels = product.variants.map((v) => getVariantSizeLabel(v)).filter((s) => s != null && String(s).trim() !== "");
    return Array.from(new Set(labels.map((s) => String(s))));
  }, [product, hasVariants, getVariantSizeLabel]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants || !selectedSize || !Array.isArray(product?.variants)) return null;
    return product.variants.find((v) => {
      const label = getVariantSizeLabel(v);
      return label != null && String(label) === String(selectedSize);
    }) ?? null;
  }, [product, selectedSize, hasVariants, getVariantSizeLabel]);

  const selectedSku = selectedVariant?.sku ?? null;
  const selectedSizeValue = getVariantSizeValue(selectedVariant) ?? null;

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    if (hasVariants) {
      const selectedInfo = getProductPriceInfo(product, selectedVariant ?? product?.variants?.[0] ?? null);
      return selectedInfo.effectivePrice;
    }
    return getProductPriceInfo(product).effectivePrice;
  }, [product, selectedVariant, hasVariants]);
  const selectedPriceInfo = useMemo(() => {
    if (!product) return { originalPrice: 0, effectivePrice: 0, hasSale: false, discountPercent: 0 };
    if (hasVariants) return getProductPriceInfo(product, selectedVariant ?? product?.variants?.[0] ?? null);
    return getProductPriceInfo(product);
  }, [product, selectedVariant, hasVariants]);

  const ratingAverage = reviewStats?.average ?? product?.rating ?? 4.5;
  const ratingTotal = reviewStats?.total ?? product?.reviewCount ?? 120;

  const thumbnails = useMemo(() => {
    if (!product) return [];
    const imgs = [product.image, ...(Array.isArray(product.srcImages) ? product.srcImages : [])].filter(Boolean);
    return Array.from(new Set(imgs));
  }, [product]);

  useEffect(() => {
    if (!hasVariants || !availableSizes.length || selectedSize) return;
    const firstInStock = product?.variants?.find((v) => (getVariantSizeLabel(v) ?? "").trim() !== "" && v?.stock > 0);
    const nextSize = firstInStock ? String(getVariantSizeLabel(firstInStock)) : availableSizes[0];
    setSelectedSize(nextSize);
  }, [product, availableSizes, selectedSize, hasVariants, getVariantSizeLabel]);

  useEffect(() => {
    const run = async () => {
      if (!product) return;
      if (!hasVariants) {
        const countInStock = product.stock ?? product.countInStock ?? product?.totalStock ?? 0;
        setStockInfo({ countInStock, available: countInStock > 0 });
        return;
      }
      if (!selectedSku) { setStockInfo(null); return; }
      setCheckingStock(true);
      try {
        const res = await getStocks([{ productId: product._id, sku: selectedSku }]);
        const first = Array.isArray(res) ? res[0] : res;
        setStockInfo(first ?? { countInStock: 0, available: false });
      } catch (err) {
        setStockInfo({ countInStock: 0, available: false });
      } finally {
        setCheckingStock(false);
      }
    };
    run();
  }, [product, selectedSku, hasVariants]);

  useEffect(() => {
    if (!stockInfo || stockInfo.available === false) return;
    const max = Number(stockInfo?.countInStock ?? 0);
    if (!Number.isFinite(max) || max <= 0) return;
    setQuantity((q) => Math.min(q, max));
  }, [stockInfo]);

  useEffect(() => {
    const run = async () => {
      if (!product) return;
      setRelatedLoading(true);
      try {
        const rel = await getProductRecommendations(product._id, 4);
        setRelatedProducts(Array.isArray(rel) ? rel : []);
      } catch (err) { setRelatedProducts([]); } finally { setRelatedLoading(false); }

      if (user?.login) {
        trackViewedProduct(product._id).catch(() => {});
      }

      setReviewsLoading(true);
      try {
        const res = await getProductReviews({ productId: product._id, page: 1, limit: 10, sort: "newest" });
        const publicReviews = Array.isArray(res?.reviews) ? res.reviews : [];
        let mine = null;
        if (user?.login) {
          try {
            mine = await getMyReviewByProduct(product._id);
          } catch (_) {
            mine = null;
          }
        }
        setMyReview(mine);
        const mergedReviews = mine
          ? [mine, ...publicReviews.filter((r) => String(r?._id) !== String(mine?._id))]
          : publicReviews;
        setReviews(mergedReviews);
        setReviewStats(res?.stats ?? null);
      } catch (err) { setReviews([]); setMyReview(null); setReviewStats(null); } finally { setReviewsLoading(false); }
    };
    run();
  }, [product, reviewsReload, user?.login]);

  const handleAddToCart = async () => {
    if (!product) return false;
    const sizeToSave = hasVariants ? selectedSizeValue : null;
    const skuToSave = hasVariants ? selectedSku : null;

    if (hasVariants && !skuToSave) { alert("Vui lòng chọn size!"); return false; }
    if (stockInfo?.available === false) { alert("Sản phẩm hiện đã hết hàng theo size đã chọn."); return false; }

    const qtySafe = (() => {
      if (!stockInfo?.available) return quantity;
      const max = Number(stockInfo?.countInStock ?? 0);
      if (!Number.isFinite(max) || max <= 0) return quantity;
      return Math.min(quantity, max);
    })();

    dispatch(addToCart({
      productId: product._id, name: product.name, image: product.image,
      price: displayPrice,
      originalPrice: Number(selectedPriceInfo.originalPrice || displayPrice),
      qty: qtySafe, sku: skuToSave, size: sizeToSave
    }));

    try {
      if (user?.login && user?.id) {
        await addToCartAPI({ userId: user.id, productId: product._id, qty: qtySafe, sku: skuToSave ?? null, size: sizeToSave ?? null });
      }
    } catch (err) { }
    return true;
  };

  const buildBuyNowCartKey = () => {
    const baseSku = hasVariants ? (selectedSku || "NO-SKU") : "default";
    return `${String(product?._id || "unknown")}::BUY_NOW::${String(baseSku)}::${Date.now()}`;
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    dispatch(toggleWishlist(product));
  };

  const handleBuyNow = async () => {
    if (!product) return;
    const sizeToSave = hasVariants ? selectedSizeValue : null;
    const skuToSave = hasVariants ? selectedSku : null;

    if (hasVariants && !skuToSave) {
      alert("Vui lòng chọn size!");
      return;
    }
    if (stockInfo?.available === false) {
      alert("Sản phẩm hiện đã hết hàng theo size đã chọn.");
      return;
    }

    const qtySafe = (() => {
      if (!stockInfo?.available) return quantity;
      const max = Number(stockInfo?.countInStock ?? 0);
      if (!Number.isFinite(max) || max <= 0) return quantity;
      return Math.min(quantity, max);
    })();

    const buyNowCartKey = buildBuyNowCartKey();
    const buyNowItem = {
      cartKey: buyNowCartKey,
      productId: product._id,
      name: product.name,
      image: product.image,
      price: displayPrice,
      originalPrice: Number(selectedPriceInfo.originalPrice || displayPrice),
      qty: qtySafe,
      sku: skuToSave,
      size: sizeToSave,
    };
    dispatch(
      addToCart({
        ...buyNowItem,
        noMerge: true,
      }),
    );

    navigate("/checkout", {
      state: {
        selectedItemKeys: [buyNowCartKey],
        buyNowItem,
      },
    });
  };

  const handleSelectReviewFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = Math.max(0, 5 - reviewFiles.length);
    if (remaining <= 0) return;
    setReviewFiles((prev) => [...prev, ...files.slice(0, remaining)]);
    e.target.value = null;
  };

  const handleSubmitReview = async () => {
    if (!product) return;
    if (!user?.login || !user?.id) { setReviewSubmitError("Vui lòng đăng nhập để viết đánh giá."); return; }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) { setReviewSubmitError("Vui lòng chọn số sao (1 đến 5)."); return; }

    setReviewSubmitting(true);
    setReviewSubmitError("");
    setReviewSubmitSuccess("");
    try {
      let orderId = null;
      const ordersResp = await getOrdersByUser(user.id, 1, 20);
      const orders = ordersResp?.data ?? ordersResp;
      const deliveredOrder = Array.isArray(orders) ? orders.find((o) => o?.status === "delivered" && Array.isArray(o?.products) && o.products.some((p) => String(p?.productId?._id ?? p?.productId) === String(product._id))) : null;
      orderId = deliveredOrder?._id ?? null;

      let images = [];
      if (reviewFiles.length > 0) {
        const formData = new FormData();
        reviewFiles.forEach((f) => formData.append("files", f));
        const uploadRes = await uploadImages(formData);
        const paths = uploadRes?.paths ?? uploadRes?.data?.paths ?? uploadRes?.data ?? [];
        if (Array.isArray(paths)) images = paths.map((p) => ({ url: p }));
      }

      await createReview({ productId: product._id, rating: reviewRating, title: reviewTitle.trim() || null, content: reviewContent.trim() || null, images, orderId });
      setReviewRating(0); setReviewTitle(""); setReviewContent(""); setReviewFiles([]); setReviewsReload((x) => x + 1);
      setReviewSubmitSuccess("Đã gửi đánh giá thành công. Đánh giá sẽ hiển thị sau khi được duyệt.");
    } catch (err) {
      setReviewSubmitError(err?.response?.data?.message || err?.message || "Không thể gửi review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const stockCountDisplay = stockInfo?.countInStock ?? product?.countInStock ?? product?.stock ?? 0;
  const maxSelectableQty = Math.max(0, Number(stockCountDisplay || 0));
  const canIncreaseQty = maxSelectableQty <= 0 ? false : quantity < maxSelectableQty;
  const isOutOfStock = maxSelectableQty <= 0 || stockInfo?.available === false;

  useEffect(() => {
    if (isOutOfStock || quantity < maxSelectableQty) setQtyNotice("");
  }, [quantity, maxSelectableQty, isOutOfStock]);

  if (!product) return (
    <div className="min-h-screen bg-background-light flex items-center justify-center font-body">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="flex flex-col lg:flex-row gap-12 mb-20 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">

          {/* LEFT: IMAGES */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100 group">
              <img
                src={getImage(mainImage)}
                onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                alt={product.name}
              />
              {product.isNew && (
                <span className="absolute top-6 left-6 bg-primary text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider backdrop-blur-md shadow-lg">New Arrival</span>
              )}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
              {thumbnails.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${mainImage === img ? "border-primary shadow-md" : "border-transparent opacity-70 hover:opacity-100 bg-slate-50"}`}
                >
                  <img src={getImage(img)} className="w-full h-full object-cover p-1" alt="" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: INFO */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{product.brandId?.name || "Premium Collection"}</span>
            <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 leading-tight mb-4">{product.name}</h1>

            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FaStar className="text-secondary text-lg" />
                <span className="text-slate-800 font-bold text-lg">{Number(ratingAverage).toFixed(1)}</span>
                <span className="text-slate-500 font-medium">({ratingTotal})</span>
              </div>
              <div className="h-5 w-px bg-slate-200"></div>
              <span className="text-slate-500 font-medium">{product.soldCount || ratingTotal} Đã Bán</span>
            </div>

            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              {selectedPriceInfo.hasSale && (
                <p className="text-slate-400 line-through font-bold text-lg mb-1">
                  {Number(selectedPriceInfo.originalPrice).toLocaleString("vi-VN")}₫
                </p>
              )}
              <p className="text-4xl md:text-5xl font-black text-primary mb-2">
                {Number(displayPrice).toLocaleString("vi-VN")}₫
              </p>
              <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-100/50 w-fit px-3 py-1.5 rounded-lg">
                <FaCheckCircle /> Còn hàng
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><FaShippingFast /></div>
                <span>Freeship toàn quốc</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><FaShieldAlt /></div>
                <span>Đổi trả miễn phí 30 ngày</span>
              </div>
            </div>

            {/* REVERTED SIZE SELECTION */}
            {hasVariants && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-800 font-bold text-lg uppercase tracking-wider">Kích Cỡ</span>
                  <button className="text-slate-400 text-sm font-medium hover:text-primary transition-colors underline underline-offset-4 decoration-2">Hướng dẫn chọn size</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {availableSizes.map((size) => {
                    const v = product.variants?.find((vv) => String(getVariantSizeLabel(vv)) === String(size));
                    const isDisabled = (v?.stock ?? 0) <= 0;
                    const isSelected = String(selectedSize) === String(size);

                    return (
                      <button
                        key={size}
                        onClick={() => !isDisabled && setSelectedSize(String(size))}
                        disabled={isDisabled}
                        className={`min-w-[4.5rem] h-12 px-4 rounded-xl font-black transition-all border-2 ${isSelected ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-95" :
                          isDisabled ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" :
                            "bg-white border-slate-100 text-slate-600 hover:border-slate-900 hover:text-slate-900"
                          }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-10 flex items-center gap-6">
              <div className="flex items-center h-14 bg-white border border-slate-200 rounded-2xl overflow-hidden p-1 shadow-sm shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-12 h-full rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                >-</button>
                <div className="w-12 h-full flex items-center justify-center font-bold text-lg text-slate-900">{quantity}</div>
                <button
                  onClick={() => {
                    if (!canIncreaseQty) {
                      setQtyNotice(isOutOfStock ? "Sản phẩm hiện đã hết hàng" : "Đã đạt số lượng tối đa kho");
                      return;
                    }
                    setQuantity((q) => Math.min(Math.max(1, maxSelectableQty || 1), q + 1));
                  }}
                  className="w-12 h-full rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >+</button>
              </div>
              <div className="text-slate-500 font-medium">
                {Math.max(0, maxSelectableQty)} sản phẩm có sẵn
              </div>
            </div>

            {qtyNotice && <p className="text-red-500 font-medium mb-6 animate-pulse">{qtyNotice}</p>}

            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={checkingStock || isOutOfStock}
                className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 text-slate-900 font-bold text-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaShoppingCart /> Thêm Vào Giỏ
              </button>
              <button
                onClick={handleBuyNow}
                disabled={checkingStock || isOutOfStock}
                className="flex-[1.5] h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mua Ngay
              </button>
              <button
                onClick={handleToggleWishlist}
                className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${isFavorited ? "border-red-500 text-red-500 bg-red-50" : "border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-400"}`}
              >
                {isFavorited ? <FaHeart size={24} /> : <FaRegHeart size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* TABS SECTION */}
        <div className="mb-20">
          <div className="flex gap-8 border-b-2 border-slate-100 mb-8 overflow-x-auto custom-scrollbar">
            {[
              { key: "desc", label: "Thông Tin Sản Phẩm" },
              { key: "review", label: `Đánh Giá (${ratingTotal})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-4 text-xl font-display font-bold transition-all relative whitespace-nowrap ${activeTab === tab.key ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
              >
                {tab.label}
                {activeTab === tab.key && <span className="absolute bottom-[-2px] left-0 w-full h-1 bg-primary rounded-full"></span>}
              </button>
            ))}
          </div>

          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 min-h-[300px]">
            {activeTab === "desc" && (
              <div className="prose prose-lg max-w-none text-slate-600 leading-relaxed font-body">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p className="text-center italic text-slate-400 py-10">Mô tả sản phẩm đang được cập nhật.</p>
                )}
              </div>
            )}

            {activeTab === "review" && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-slate-50 p-8 rounded-2xl mb-12 flex flex-col md:flex-row gap-8 items-center border border-slate-100">
                  <div className="flex flex-col items-center justify-center text-center shrink-0 w-48">
                    <p className="text-5xl font-black text-slate-900 mb-2">{Number(ratingAverage).toFixed(1)}</p>
                    <div className="flex text-secondary text-lg mb-2">
                      {[1, 2, 3, 4, 5].map(i => <FaStar key={i} className={i <= Math.round(ratingAverage) ? "opacity-100" : "opacity-30"} />)}
                    </div>
                    <p className="text-slate-500 font-medium">{ratingTotal} Đánh giá</p>
                  </div>
                  <div className="w-px h-24 bg-slate-200 hidden md:block"></div>
                  <div className="flex-1 w-full">
                    {!user?.login ? (
                      <div className="text-center">
                        <p className="text-slate-600 font-medium mb-4">Vui lòng đăng nhập để gửi đánh giá của bạn.</p>
                        <Link to="/login" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-primary transition-colors">Đăng Nhập Ngay</Link>
                      </div>
                    ) : (
                      <div>
                        {reviewSubmitError && <p className="text-red-500 bg-red-50 p-3 rounded-lg font-medium mb-4">{reviewSubmitError}</p>}
                        {reviewSubmitSuccess && <p className="text-green-700 bg-green-50 p-3 rounded-lg font-medium mb-4">{reviewSubmitSuccess}</p>}
                        <div className="flex items-center gap-4 mb-4">
                          <span className="font-bold text-slate-700">Đánh giá của bạn:</span>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} onClick={() => setReviewRating(n)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${reviewRating >= n ? "bg-secondary text-white" : "bg-white text-slate-300 border border-slate-200 hover:border-secondary hover:text-secondary"}`}><FaStar /></button>
                            ))}
                          </div>
                        </div>
                        <input className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 mb-4 font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Tiêu đề (Tùy chọn)" />
                        <textarea className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 mb-4 font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all custom-scrollbar shrink-0" rows={3} value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..." />
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 items-center">
                            <label className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3 rounded-xl transition-colors">
                              Thêm Ảnh
                              <input type="file" accept="image/*" multiple disabled={reviewSubmitting} onChange={handleSelectReviewFiles} className="hidden" />
                            </label>
                            {reviewFilePreviews.length > 0 && <span className="font-medium text-slate-500">{reviewFiles.length}/5 ảnh</span>}
                          </div>
                          <button onClick={handleSubmitReview} disabled={reviewSubmitting || !reviewRating} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/30">{reviewSubmitting ? "Đang gửi..." : "Gửi Đánh Giá"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  {reviewsLoading ? (
                    <div className="text-center py-10 font-medium text-slate-500">Đang tải đánh giá...</div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">✍️</span></div>
                      <p className="font-medium text-slate-500">Chưa có đánh giá nào cho sản phẩm này.</p>
                    </div>
                  ) : (
                    reviews.map((r) => (
                      <div key={r._id} className="border-b border-slate-100 pb-6 last:border-0">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold capitalize">{(r.userId?.name || "U")[0]}</div>
                            <div>
                              <p className="font-bold text-slate-800">{r.userId?.name || "Khách hàng"}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex text-secondary text-sm">
                                  {[...Array(5)].map((_, i) => <FaStar key={i} className={i < r.rating ? "opacity-100" : "opacity-30"} />)}
                                </div>
                                {String(r?._id) === String(myReview?._id) && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${r?.status === "approved" ? "bg-green-100 text-green-700" : r?.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                    {r?.status === "approved" ? "Đã duyệt" : r?.status === "rejected" ? "Bị từ chối" : "Chờ duyệt"}
                                  </span>
                                )}
                                {r.verifiedPurchase && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-sm">Đã mua</span>}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : ""}</span>
                        </div>
                        {r.title && <p className="font-bold text-slate-800 mb-2">{r.title}</p>}
                        {r.content && <p className="text-slate-600 leading-relaxed mb-4">{r.content}</p>}
                        {Array.isArray(r.images) && r.images.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {r.images.map((img, idx) => (
                              <div key={idx} className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-primary transition-colors">
                                <img src={getImage(img?.url ?? img)} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <RelatedProducts
          title="Sản phẩm gợi ý cho bạn"
          products={relatedProducts}
          loading={relatedLoading}
        />

      </div>
    </div>
  );
};

export default ProductDetail;