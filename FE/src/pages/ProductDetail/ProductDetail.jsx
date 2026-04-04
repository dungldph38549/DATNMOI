import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
import {
  addToCartAPI, getMyReviewsByProduct, getProductById,
  getProductRecommendations, getProductReviews, getStocks, trackViewedProduct,
} from "../../api";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";
import { FaStar, FaStarHalfAlt, FaShoppingCart, FaCheckCircle, FaShippingFast, FaShieldAlt, FaHeart, FaRegHeart, FaRulerCombined, FaTimes, FaThumbsUp } from "react-icons/fa";
import { getProductPriceInfo } from "../../utils/pricing";
import BackButton from "../../components/Common/BackButton";
import RelatedProducts from "../../components/RelatedProducts/RelatedProducts";
import notify from "../../utils/notify";
import {
  getOrderStatusLabelForReview,
  shouldShowOrderStatusOnReview,
} from "../../utils/orderStatusForReview";

const SHOPEE_ORANGE = "#EE4D2D";

/** Tách nội dung dạng "Nhãn: giá trị" (xuống dòng) và đoạn tự do */
const parseReviewContentBlocks = (text) => {
  if (!text || typeof text !== "string") return { kv: [], body: "" };
  const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const kv = [];
  const body = [];
  const labelRe = /^(Chất lượng|Đa dạng|Độ bền|Chất liệu)\s*:\s*(.+)$/i;
  for (const line of lines) {
    const m = line.match(labelRe);
    if (m) kv.push({ label: m[1].trim(), value: m[2].trim() });
    else body.push(line);
  }
  return { kv, body: body.join("\n").trim() };
};

const stripHtmlToText = (html) => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/** Lấy Size / Color từ chuỗi phân loại (đánh giá cũ không có snapshot). */
const parseSizeFromVariantLabel = (label) => {
  if (!label || typeof label !== "string") return null;
  for (const part of label.split("·")) {
    const t = part.trim();
    const m = t.match(/^(?:Size|EU|Kích\s*cỡ)\s*:\s*(.+)$/i);
    if (m) return m[1].trim();
  }
  return null;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const cartItems = useSelector((state) => state.cart.items || []);
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const isFavorited = wishlistItems.some((item) => item._id === id);

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [activeTab, setActiveTab] = useState("desc");
  const [mainImage, setMainImage] = useState("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [footLength, setFootLength] = useState("");

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [reviews, setReviews] = useState([]);
  /** Đánh giá của user cho SP (mỗi lần mua tối đa một bản ghi) */
  const [myReviews, setMyReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  /** all | 1..5 | comment | media */
  const [reviewListFilter, setReviewListFilter] = useState("all");

  const [checkingStock, setCheckingStock] = useState(false);
  const [stockInfo, setStockInfo] = useState(null);
  const [qtyNotice, setQtyNotice] = useState("");

  const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";

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

  const getVariantColorValue = useCallback((variant) => {
    const attrs = variant?.attributes;
    if (!attrs) return null;
    if (typeof attrs.get === "function") return attrs.get("Color") ?? attrs.get("color") ?? attrs.get("COLOR") ?? null;
    if (typeof attrs === "object") {
      if (attrs.Color != null) return attrs.Color;
      if (attrs.color != null) return attrs.color;
      const foundKey = Object.keys(attrs).find((k) => String(k).toLowerCase() === "color");
      if (foundKey) return attrs[foundKey];
    }
    return null;
  }, []);

  const getVariantColorLabel = useCallback((variant) => {
    const val = getVariantColorValue(variant);
    return val != null ? String(val) : "";
  }, [getVariantColorValue]);

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
    const withSize = product.variants.filter((v) => {
      const label = getVariantSizeLabel(v);
      return label != null && String(label) === String(selectedSize);
    });
    if (!withSize.length) return null;
    const hasColorInThisSize = withSize.some((v) => (getVariantColorLabel(v) ?? "").trim() !== "");
    if (!hasColorInThisSize) return withSize[0] ?? null;
    if (selectedColor) {
      const exact = withSize.find((v) => String(getVariantColorLabel(v) ?? "") === String(selectedColor));
      if (exact) return exact;
    }
    return withSize.find((v) => (v?.stock ?? 0) > 0) ?? withSize[0] ?? null;
  }, [product, selectedSize, selectedColor, hasVariants, getVariantSizeLabel, getVariantColorLabel]);

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

  /** Trung bình sao từ API (tất cả đánh giá đã duyệt); khi chưa tải xong thì tạm dùng dữ liệu sản phẩm nếu có */
  const ratingAverage = useMemo(() => {
    if (reviewStats != null) {
      const a = Number(reviewStats.average);
      return Number.isFinite(a) ? a : 0;
    }
    if (reviewsLoading) {
      const a = Number(product?.rating);
      return Number.isFinite(a) ? a : null;
    }
    const a = Number(product?.rating);
    return Number.isFinite(a) ? a : 0;
  }, [reviewStats, reviewsLoading, product?.rating]);

  const ratingTotal = useMemo(() => {
    if (reviewStats != null) {
      const t = Number(reviewStats.total);
      return Number.isFinite(t) ? t : 0;
    }
    if (reviewsLoading) {
      const t = Number(product?.reviewCount);
      return Number.isFinite(t) ? t : null;
    }
    const t = Number(product?.reviewCount);
    return Number.isFinite(t) ? t : 0;
  }, [reviewStats, reviewsLoading, product?.reviewCount]);

  const averageStarsDisplay = useMemo(() => {
    const v = Math.min(5, Math.max(0, Number(ratingAverage) || 0));
    return [1, 2, 3, 4, 5].map((i) => {
      const fill = Math.min(1, Math.max(0, v - (i - 1)));
      if (fill >= 1) return <FaStar key={i} className="opacity-100" />;
      if (fill >= 0.5) return <FaStarHalfAlt key={i} className="opacity-100" />;
      return <FaStar key={i} className="opacity-30" />;
    });
  }, [ratingAverage]);

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

  const availableColors = useMemo(() => {
    if (!hasVariants || !selectedSize || !Array.isArray(product?.variants)) return [];
    const colors = product.variants
      .filter((v) => String(getVariantSizeLabel(v) ?? "") === String(selectedSize))
      .map((v) => getVariantColorLabel(v))
      .filter((c) => c != null && String(c).trim() !== "");
    return Array.from(new Set(colors.map((c) => String(c))));
  }, [product, hasVariants, selectedSize, getVariantSizeLabel, getVariantColorLabel]);

  useEffect(() => {
    if (!hasVariants || !selectedSize) return;
    if (!Array.isArray(product?.variants) || !product.variants.length) return;
    if (!availableColors.length) {
      if (selectedColor) setSelectedColor(null);
      return;
    }
    const isCurrentValid = availableColors.some((c) => String(c) === String(selectedColor));
    if (isCurrentValid) return;
    const matched = product.variants.find(
      (v) =>
        String(getVariantSizeLabel(v) ?? "") === String(selectedSize) &&
        (getVariantColorLabel(v) ?? "").trim() !== "" &&
        (v?.stock ?? 0) > 0,
    );
    setSelectedColor(String(getVariantColorLabel(matched) || availableColors[0]));
  }, [product, hasVariants, selectedSize, selectedColor, availableColors, getVariantSizeLabel, getVariantColorLabel]);

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
    if (!product) return;
    const run = async () => {
      setRelatedLoading(true);
      try {
        const rel = await getProductRecommendations(product._id, 4);
        setRelatedProducts(Array.isArray(rel) ? rel : []);
      } catch (err) {
        setRelatedProducts([]);
      } finally {
        setRelatedLoading(false);
      }
      if (user?.login) {
        trackViewedProduct(product._id).catch(() => {});
      }
    };
    run();
  }, [product, user?.login]);

  useEffect(() => {
    const run = async () => {
      if (!product) return;
      setReviewsLoading(true);
      setReviewStats(null);
      try {
        const needWide =
          reviewListFilter === "comment" || reviewListFilter === "media";
        const starNum =
          reviewListFilter === "1" ||
          reviewListFilter === "2" ||
          reviewListFilter === "3" ||
          reviewListFilter === "4" ||
          reviewListFilter === "5"
            ? Number(reviewListFilter)
            : null;
        const res = await getProductReviews({
          productId: product._id,
          page: 1,
          limit: needWide ? 100 : 50,
          sort: "newest",
          ...(starNum != null && !needWide ? { rating: starNum } : {}),
        });
        const publicReviews = Array.isArray(res?.reviews) ? res.reviews : [];
        let mineList = [];
        if (user?.login) {
          try {
            const rawMine = await getMyReviewsByProduct(product._id);
            mineList = Array.isArray(rawMine)
              ? rawMine.filter((r) => r?.status !== "rejected")
              : [];
          } catch (_) {
            mineList = [];
          }
        }
        setMyReviews(mineList);
        const mineIds = new Set(mineList.map((m) => String(m?._id)));
        let mergedReviews = [
          ...mineList,
          ...publicReviews.filter((r) => !mineIds.has(String(r?._id))),
        ].filter((r) => r?.status !== "rejected");
        if (reviewListFilter === "comment") {
          mergedReviews = mergedReviews.filter(
            (r) => r?.content && String(r.content).trim().length > 0,
          );
        } else if (reviewListFilter === "media") {
          mergedReviews = mergedReviews.filter(
            (r) => Array.isArray(r?.images) && r.images.length > 0,
          );
        }
        if (starNum != null) {
          mergedReviews = mergedReviews.filter(
            (r) => Number(r?.rating) === starNum,
          );
        }
        setReviews(mergedReviews);
        setReviewStats(res?.stats ?? null);
      } catch (err) {
        setReviews([]);
        setMyReviews([]);
        setReviewStats(null);
      } finally {
        setReviewsLoading(false);
      }
    };
    run();
  }, [product, user?.login, reviewListFilter]);

  const myReviewIdSet = useMemo(
    () => new Set(myReviews.map((m) => String(m?._id))),
    [myReviews],
  );

  const reviewDistribution = useMemo(() => {
    const d = reviewStats?.distribution;
    if (!d || typeof d !== "object")
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    return {
      1: Number(d[1]) || 0,
      2: Number(d[2]) || 0,
      3: Number(d[3]) || 0,
      4: Number(d[4]) || 0,
      5: Number(d[5]) || 0,
    };
  }, [reviewStats]);

  const handleAddToCart = async () => {
    if (!product) return false;
    if (!user?.login || !user?.token) {
      notify.warning("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
      navigate("/login", { state: { from: `/product/${product._id}` } });
      return false;
    }
    const sizeToSave = hasVariants ? selectedSizeValue : null;
    const skuToSave = hasVariants ? selectedSku : null;

    if (hasVariants && !skuToSave) { notify.warning("Vui long chon size!"); return false; }
    if (stockInfo?.available === false) { notify.warning("Sản phẩm đã hết hàng với phân loại đã chọn."); return false; }

    const maxStock = Number(stockInfo?.countInStock ?? 0);
    if (!Number.isFinite(maxStock) || maxStock <= 0) {
      notify.warning("Sản phẩm đã hết hàng.");
      return false;
    }

    const targetSku =
      skuToSave == null || String(skuToSave).trim() === ""
        ? null
        : String(skuToSave).trim().toUpperCase();
    const alreadyInCart = cartItems.reduce((sum, i) => {
      if (String(i.productId) !== String(product._id)) return sum;
      const iSku =
        i.sku == null || String(i.sku).trim() === ""
          ? null
          : String(i.sku).trim().toUpperCase();
      if (targetSku == null && iSku == null) return sum + Number(i.qty || 0);
      if (targetSku != null && iSku === targetSku) return sum + Number(i.qty || 0);
      return sum;
    }, 0);

    const remaining = Math.max(0, maxStock - alreadyInCart);
    if (remaining <= 0) {
      notify.warning("Đã đạt số lượng tối đa trong kho cho sản phẩm này (đã có trong giỏ).");
      return false;
    }

    const qtySafe = Math.min(quantity, remaining);
    if (qtySafe < quantity) {
      notify.warning(
        `Chỉ còn ${remaining} sản phẩm trong kho (đã có ${alreadyInCart} trong giỏ).`,
      );
    }

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
    if (!user?.login || !user?.token) {
      notify.warning("Vui lòng đăng nhập để mua hàng.");
      navigate("/login", { state: { from: `/product/${product._id}` } });
      return;
    }
    const sizeToSave = hasVariants ? selectedSizeValue : null;
    const skuToSave = hasVariants ? selectedSku : null;

    if (hasVariants && !skuToSave) {
      notify.warning("Vui long chon size!");
      return;
    }
    if (stockInfo?.available === false) {
      notify.warning("Sản phẩm đã hết hàng với phân loại đã chọn.");
      return;
    }

    const maxStock = Number(stockInfo?.countInStock ?? 0);
    if (!Number.isFinite(maxStock) || maxStock <= 0) {
      notify.warning("Sản phẩm đã hết hàng.");
      return;
    }

    const targetSku =
      skuToSave == null || String(skuToSave).trim() === ""
        ? null
        : String(skuToSave).trim().toUpperCase();
    const alreadyInCart = cartItems.reduce((sum, i) => {
      if (String(i.productId) !== String(product._id)) return sum;
      const iSku =
        i.sku == null || String(i.sku).trim() === ""
          ? null
          : String(i.sku).trim().toUpperCase();
      if (targetSku == null && iSku == null) return sum + Number(i.qty || 0);
      if (targetSku != null && iSku === targetSku) return sum + Number(i.qty || 0);
      return sum;
    }, 0);

    const remaining = Math.max(0, maxStock - alreadyInCart);
    if (remaining <= 0) {
      notify.warning("Đã đạt số lượng tối đa trong kho cho sản phẩm này (đã có trong giỏ).");
      return;
    }

    const qtySafe = Math.min(quantity, remaining);
    if (qtySafe < quantity) {
      notify.warning(
        `Chỉ còn ${remaining} sản phẩm trong kho (đã có ${alreadyInCart} trong giỏ).`,
      );
    }

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

  const stockCountDisplay = stockInfo?.countInStock ?? product?.countInStock ?? product?.stock ?? 0;
  const maxSelectableQty = Math.max(0, Number(stockCountDisplay || 0));
  const canIncreaseQty = maxSelectableQty <= 0 ? false : quantity < maxSelectableQty;
  const isOutOfStock = maxSelectableQty <= 0 || stockInfo?.available === false;
  const sizeGuideRows = useMemo(
    () => [
      { eu: "36", footMin: 22.0, footMax: 22.5 },
      { eu: "37", footMin: 22.6, footMax: 23.0 },
      { eu: "38", footMin: 23.1, footMax: 23.5 },
      { eu: "39", footMin: 23.6, footMax: 24.0 },
      { eu: "40", footMin: 24.1, footMax: 24.5 },
      { eu: "41", footMin: 24.6, footMax: 25.0 },
      { eu: "42", footMin: 25.1, footMax: 25.5 },
      { eu: "43", footMin: 25.6, footMax: 26.0 },
      { eu: "44", footMin: 26.1, footMax: 26.5 },
      { eu: "45", footMin: 26.6, footMax: 27.0 },
    ],
    [],
  );
  const recommendedSize = useMemo(() => {
    const len = Number(footLength);
    if (!Number.isFinite(len) || len <= 0) return null;
    const found =
      sizeGuideRows.find((r) => len >= r.footMin && len <= r.footMax) ||
      sizeGuideRows.find((r) => len <= r.footMax) ||
      sizeGuideRows[sizeGuideRows.length - 1];
    return found?.eu ?? null;
  }, [footLength, sizeGuideRows]);

  useEffect(() => {
    if (!showSizeGuide) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowSizeGuide(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showSizeGuide]);

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
                <div className="flex text-secondary text-lg">{averageStarsDisplay}</div>
                <span className="text-slate-800 font-bold text-lg">
                  {ratingAverage == null ? "—" : Number(ratingAverage).toFixed(1)}
                </span>
                <span className="text-slate-500 font-medium">
                  ({ratingTotal == null ? "—" : ratingTotal})
                </span>
              </div>
              <div className="h-5 w-px bg-slate-200"></div>
              <span className="text-slate-500 font-medium">{product.soldCount ?? 0} Đã Bán</span>
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
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="inline-flex items-center gap-2 text-slate-700 text-sm font-bold bg-slate-100 hover:bg-slate-900 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-slate-200"
                  >
                    <FaRulerCombined />
                    Hướng dẫn chọn size
                  </button>
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

            {hasVariants && availableColors.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-800 font-bold text-lg uppercase tracking-wider">Màu sắc</span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Đã chọn: {selectedColor || availableColors[0]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    const variantByColor = product.variants?.find(
                      (vv) =>
                        String(getVariantSizeLabel(vv) ?? "") === String(selectedSize) &&
                        String(getVariantColorLabel(vv) ?? "") === String(color),
                    );
                    const isDisabled = (variantByColor?.stock ?? 0) <= 0;
                    const isSelected = String(selectedColor || "") === String(color);
                    return (
                      <button
                        key={color}
                        onClick={() => !isDisabled && setSelectedColor(String(color))}
                        disabled={isDisabled}
                        className={`h-12 px-4 rounded-xl font-bold transition-all border-2 inline-flex items-center gap-2 ${isSelected ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-95" :
                          isDisabled ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" :
                            "bg-white border-slate-100 text-slate-600 hover:border-slate-900 hover:text-slate-900"
                          }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? "bg-white" : "bg-slate-400"}`}></span>
                        {color}
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
              { key: "review", label: `Đánh Giá (${ratingTotal == null ? "—" : ratingTotal})` },
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
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="rounded-lg border border-slate-200 bg-[#FFFBF8] px-4 py-5 md:px-6 md:py-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="shrink-0">
                      <p className="text-2xl md:text-3xl font-black leading-tight" style={{ color: SHOPEE_ORANGE }}>
                        {ratingAverage == null ? "—" : Number(ratingAverage).toFixed(1)}{" "}
                        <span className="text-base md:text-lg font-bold text-slate-800">trên 5</span>
                      </p>
                      <div
                        className="flex gap-0.5 mt-2 text-lg md:text-xl"
                        style={{ color: SHOPEE_ORANGE }}
                        aria-hidden
                      >
                        {averageStarsDisplay}
                      </div>
                      <p className="text-sm text-slate-500 mt-2 font-medium">
                        {ratingTotal == null ? "—" : ratingTotal} đánh giá
                      </p>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "all", label: "Tất cả", count: ratingTotal },
                          { id: "5", label: "5 Sao", count: reviewDistribution[5] },
                          { id: "4", label: "4 Sao", count: reviewDistribution[4] },
                          { id: "3", label: "3 Sao", count: reviewDistribution[3] },
                          { id: "2", label: "2 Sao", count: reviewDistribution[2] },
                          { id: "1", label: "1 Sao", count: reviewDistribution[1] },
                          { id: "comment", label: "Có bình luận", count: null },
                        ].map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setReviewListFilter(chip.id)}
                            className={`px-3 py-1.5 rounded border text-xs font-bold transition-colors ${
                              reviewListFilter === chip.id
                                ? "border-[#EE4D2D] text-[#EE4D2D] bg-white shadow-sm"
                                : "border-slate-200 text-slate-600 bg-white hover:border-slate-300"
                            }`}
                          >
                            {chip.label}
                            {chip.count != null && ` (${chip.count})`}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewListFilter("media")}
                          className={`px-3 py-1.5 rounded border text-xs font-bold transition-colors ${
                            reviewListFilter === "media"
                              ? "border-[#EE4D2D] text-[#EE4D2D] bg-white shadow-sm"
                              : "border-slate-200 text-slate-600 bg-white hover:border-slate-300"
                          }`}
                        >
                          Có Hình Ảnh / Video
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {product && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Thông tin sản phẩm</h4>
                    </div>
                    <div className="p-4 md:p-6 flex flex-col sm:flex-row gap-5">
                      <div className="shrink-0 w-full sm:w-36 h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img
                          src={getImage(product.image || product.srcImages?.[0])}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <h3 className="text-lg md:text-xl font-black text-slate-900 leading-snug">{product.name}</h3>
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-700">Thương hiệu:</span>{" "}
                          {product.brandId?.name || "—"}
                        </p>
                        {product.categoryId?.name && (
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">Danh mục:</span>{" "}
                            {product.categoryId.name}
                          </p>
                        )}
                        <p className="text-lg font-black" style={{ color: SHOPEE_ORANGE }}>
                          {Number(displayPrice).toLocaleString("vi-VN")}₫
                        </p>
                        {hasVariants && Array.isArray(product.variants) && (
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">Phân loại:</span>{" "}
                            {product.variants.length} biến thể (SKU theo từng lựa chọn)
                          </p>
                        )}
                        {(product.shortDescription || product.description) && (
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                            {product.shortDescription?.trim()
                              ? product.shortDescription
                              : stripHtmlToText(product.description)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Đánh giá sản phẩm</h4>
                  </div>
                  <div className="p-4 md:p-6">
                    {reviewsLoading ? (
                      <div className="text-center py-12 font-medium text-slate-500">Đang tải đánh giá...</div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="font-medium text-slate-500">
                          {ratingTotal == null || ratingTotal === 0
                            ? "Chưa có đánh giá nào cho sản phẩm này."
                            : "Không có đánh giá phù hợp bộ lọc đã chọn."}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {reviews.map((r) => {
                          const parsed = parseReviewContentBlocks(r.content || "");
                          const snap = r.productSnapshot;
                          /** Chỉ lấy size (snapshot → orderedVariantText → parse variantLabel). */
                          const purchaseSizeLine =
                            snap?.purchaseSize ||
                            parseSizeFromVariantLabel(snap?.orderedVariantText) ||
                            parseSizeFromVariantLabel(r.variantLabel) ||
                            null;
                          const dateStr = r.createdAt
                            ? new Date(r.createdAt).toLocaleString("vi-VN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "";
                          const sizeLine = `Phân loại hàng: ${purchaseSizeLine || "—"}`;
                          const metaLine = dateStr ? `${dateStr} | ${sizeLine}` : sizeLine;
                          return (
                            <div key={r._id} className="py-5 first:pt-0">
                              <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0 border border-slate-200">
                                  {(r.userId?.name || "U")[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-900">{r.userId?.name || "Khách hàng"}</p>
                                  <div className="flex gap-0.5 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                      <FaStar
                                        key={i}
                                        className="text-sm"
                                        style={{ color: i < r.rating ? SHOPEE_ORANGE : "#e5e7eb" }}
                                      />
                                    ))}
                                  </div>
                                  <div className="mt-1.5 space-y-0.5" title={metaLine}>
                                    {dateStr ? (
                                      <p className="text-xs text-slate-400">{dateStr}</p>
                                    ) : null}
                                    <p className="text-xs text-slate-500">{sizeLine}</p>
                                  </div>
                                  {(() => {
                                    const ost = r.orderId?.status;
                                    if (!shouldShowOrderStatusOnReview(ost)) return null;
                                    const lbl = getOrderStatusLabelForReview(ost);
                                    if (!lbl) return null;
                                    return (
                                      <p className="text-xs text-amber-900 mt-1 font-semibold">
                                        Trạng thái đơn: {lbl}
                                      </p>
                                    );
                                  })()}
                                  {myReviewIdSet.has(String(r?._id)) && (
                                    <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${r?.status === "approved" ? "bg-green-100 text-green-700" : r?.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                      {r?.status === "approved" ? "Đã duyệt" : r?.status === "rejected" ? "Bị từ chối" : "Chờ duyệt"}
                                    </span>
                                  )}
                                  {r.title && <p className="font-bold text-slate-900 mt-3 text-sm">{r.title}</p>}
                                  {parsed.kv.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {parsed.kv.map((row, idx) => (
                                        <p key={`${row.label}-${idx}`} className="text-sm text-slate-800">
                                          <span className="font-bold">{row.label}:</span>{" "}
                                          <span className="font-normal text-slate-700">{row.value}</span>
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {parsed.body && (
                                    <p className="text-sm text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">{parsed.body}</p>
                                  )}
                                  {!parsed.kv.length && !parsed.body && r.content && (
                                    <p className="text-sm text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">{r.content}</p>
                                  )}
                                  {Array.isArray(r.images) && r.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {r.images.map((img, idx) => (
                                        <div key={idx} className="w-20 h-20 rounded border border-slate-200 overflow-hidden bg-slate-50">
                                          <img src={getImage(img?.url ?? img)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#EE4D2D] transition-colors"
                                  >
                                    <FaThumbsUp className="text-sm" />
                                    Hữu ích?
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

      {showSizeGuide && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setShowSizeGuide(false)}>
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Đóng hướng dẫn chọn size"
              onClick={() => setShowSizeGuide(false)}
              className="absolute top-16 right-6 md:top-16 md:right-8 w-10 h-10 rounded-full border border-slate-300 bg-white text-slate-700 hover:text-white hover:bg-slate-900 hover:border-slate-900 shadow-sm transition-all duration-200 flex items-center justify-center"
            >
              <FaTimes size={14} />
            </button>
            <div className="mb-5 pr-14">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-black text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
                  <FaRulerCombined />
                  Size Guide
                </span>
                <h3 className="text-xl md:text-2xl font-display font-black text-slate-900">Hướng dẫn chọn size</h3>
                <p className="text-slate-500 text-sm mt-1">Đo chiều dài bàn chân (cm) từ gót đến ngón dài nhất để chọn size gần đúng.</p>
              </div>
            </div>

            <div className="mb-5 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-2xl p-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Nhập chiều dài chân của bạn (cm)</label>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  type="number"
                  step="0.1"
                  min="18"
                  max="35"
                  value={footLength}
                  onChange={(e) => setFootLength(e.target.value)}
                  placeholder="VD: 25.2"
                  className="w-full sm:w-48 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div className="text-sm font-semibold text-slate-600">
                  {recommendedSize ? (
                    <span className="inline-flex items-center gap-2">
                      Gợi ý size:
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-white font-black text-sm shadow-lg shadow-primary/30">
                        EU {recommendedSize}
                      </span>
                    </span>
                  ) : (
                    <span>Nhập chiều dài để nhận gợi ý nhanh.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100">
                    <th className="text-left px-4 py-3 font-bold">Size EU</th>
                    <th className="text-left px-4 py-3 font-bold">Chiều dài chân (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeGuideRows.map((row) => (
                    <tr
                      key={row.eu}
                      className={`border-t border-slate-100 ${String(recommendedSize) === String(row.eu) ? "bg-primary/5" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-3 font-bold text-slate-800">EU {row.eu}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.footMin.toFixed(1)} - {row.footMax.toFixed(1)} cm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Mẹo: nếu số đo nằm giữa 2 size và bạn thích đi thoải mái, hãy chọn size lớn hơn 0.5 - 1.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;