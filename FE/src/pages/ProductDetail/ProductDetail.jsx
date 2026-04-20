import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
import {
  addToCartAPI, fetchProducts, getMyReviewsByProduct, getProductById,
  getProductRecommendations, getProductReviews, getStocks, trackViewedProduct,
} from "../../api";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";
import { FaStar, FaStarHalfAlt, FaShoppingCart, FaCheckCircle, FaShippingFast, FaShieldAlt, FaHeart, FaRegHeart, FaRulerCombined, FaTimes, FaThumbsUp, FaChevronDown } from "react-icons/fa";
import { getProductPriceInfo } from "../../utils/pricing";
import notify from "../../utils/notify";
import {
  getOrderStatusLabelForReview,
  shouldShowOrderStatusOnReview,
} from "../../utils/orderStatusForReview";
import SizeGuideInner from "../../components/SizeGuide/SizeGuideInner";

const REVIEW_ACCENT = "#1a1a1a";

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
  const [activeTab, setActiveTab] = useState("story");
  const [mainImage, setMainImage] = useState("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);

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
    const isAccessoryProduct = String(
  product?.categoryId?.slug ||
  product?.categoryId?.name ||
  product?.category ||
  ""
)
  .toLowerCase()
  .includes("phụ kiện");
    console.log("Category check:", product?.categoryId?.slug, product?.categoryId?.name, product?.category, "isAccessory:", isAccessoryProduct);

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
      if (fill >= 1) return <FaStar key={i} className="text-sm text-convot-charcoal" />;
      if (fill >= 0.5) return <FaStarHalfAlt key={i} className="text-sm text-convot-charcoal" />;
      return <FaStar key={i} className="text-sm text-neutral-300" />;
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
    if (!product || !hasVariants) return [];
    const colors = product.variants
      .map((v) => getVariantColorLabel(v))
      .filter((c) => c != null && String(c).trim() !== "");
    return Array.from(new Set(colors.map((c) => String(c))));
  }, [product, hasVariants, getVariantColorLabel]);

  /** 
   * Logic chọn size: Ưu tiên giữ màu hiện tại. 
   * Nếu màu hiện tại không có trong size mới, chọn màu đầu tiên có sẵn của size đó.
   */
  const handleSizeClick = (size) => {
    setSelectedSize(size);
    const variantsInSize = product.variants.filter(v => String(getVariantSizeLabel(v)) === String(size));
    const hasCurrentColor = variantsInSize.some(v => String(getVariantColorLabel(v)) === String(selectedColor));
    
    if (!hasCurrentColor && variantsInSize.length > 0) {
      const firstInStock = variantsInSize.find(v => (v.stock ?? 0) > 0) || variantsInSize[0];
      setSelectedColor(String(getVariantColorLabel(firstInStock) || ""));
    }
  };

  /** 
   * Logic chọn màu: Ưu tiên giữ size hiện tại. 
   * Nếu size hiện tại không có màu mới, chọn size đầu tiên có sẵn của màu đó.
   */
  const handleColorClick = (color) => {
    setSelectedColor(color);
    const variantsInColor = product.variants.filter(v => String(getVariantColorLabel(v)) === String(color));
    const hasCurrentSize = variantsInColor.some(v => String(getVariantSizeLabel(v)) === String(selectedSize));

    if (!hasCurrentSize && variantsInColor.length > 0) {
      const firstInStock = variantsInColor.find(v => (v.stock ?? 0) > 0) || variantsInColor[0];
      setSelectedSize(String(getVariantSizeLabel(firstInStock) || ""));
    }
  };

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
        const rel = await getProductRecommendations(product._id, 16);
        let list = Array.isArray(rel) ? rel : [];
        if (list.length === 0) {
          const catId = product.categoryId?._id ?? product.categoryId;
          if (catId) {
            try {
              const res = await fetchProducts({ limit: 24, page: 0, categoryId: catId });
              const raw = res?.data ?? res ?? [];
              const arr = Array.isArray(raw) ? raw : [];
              list = arr
                .filter((p) => String(p?._id) !== String(product._id))
                .slice(0, 12);
            } catch (_) {
              list = [];
            }
          }
        }
        setRelatedProducts(list);
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

    if (hasVariants && !skuToSave) { notify.warning("Vui lòng chọn kích cỡ!"); return false; }
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
      notify.warning("Vui lòng chọn kích cỡ!");
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

  /** EU / số → "Size …" (kích cỡ) hoặc "Màu …" (màu) tùy dimension */
  const formatVariantButtonLabel = (raw, dimension) => {
    const s = String(raw ?? "").trim();
    if (!s) return s;
    const afterEu = s.replace(/^eu\s*/i, "").trim();
    if (dimension === "size") {
      if (/^eu\s/i.test(s) || /^\d+(\.\d+)?$/.test(afterEu) || /^\d+(\.\d+)?$/.test(s)) {
        const num = /^\d+(\.\d+)?$/.test(s) ? s : afterEu;
        return `Size ${num}`;
      }
      return s;
    }
    if (dimension === "color") {
      if (/^eu\s/i.test(s)) return `Màu ${afterEu}`;
      return s;
    }
    return s;
  };

  if (!product) return (
    <div className="flex min-h-screen items-center justify-center bg-convot-cream font-body">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-neutral-200 border-t-convot-charcoal" />
    </div>
  );

  return (
    <div className="min-h-screen bg-convot-cream font-body pb-16 pt-16 md:pt-20">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          <div className="lg:col-span-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="relative hidden w-full flex-shrink-0 sm:flex sm:w-[76px] sm:flex-col">
                <div className="flex max-h-[min(520px,68vh)] flex-col gap-2 overflow-y-auto pr-1 no-scrollbar">
                  {thumbnails.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMainImage(img)}
                      className={`relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        mainImage === img
                          ? "border-convot-charcoal shadow-sm"
                          : "border-neutral-200 bg-white opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img src={getImage(img)} className="h-full w-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
                {thumbnails.length > 4 ? (
                  <div className="mt-2 flex justify-center text-neutral-400" aria-hidden>
                    <FaChevronDown className="text-xs" />
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar sm:hidden">
                {thumbnails.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainImage(img)}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                      mainImage === img ? "border-convot-charcoal" : "border-neutral-200 opacity-80"
                    }`}
                  >
                    <img src={getImage(img)} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>

              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  src={getImage(mainImage)}
                  onError={(e) => {
                    e.target.src = PLACEHOLDER_IMG;
                  }}
                  className="h-full w-full object-cover transition duration-700 ease-out hover:scale-[1.02]"
                  alt={product.name}
                />
                {product.isNew && (
                  <span className="absolute left-5 top-5 rounded-full bg-convot-charcoal px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                    Mới
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              {product.brandId?.name || "CONVOT"}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-convot-charcoal md:text-5xl">
              {product.name}
            </h1>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              {selectedPriceInfo.hasSale && (
                <span className="text-lg text-neutral-400 line-through">
                  {Number(selectedPriceInfo.originalPrice).toLocaleString("vi-VN")}đ
                </span>
              )}
              <span className="text-3xl font-medium text-convot-charcoal md:text-[2rem]">
                {Number(displayPrice).toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex gap-0.5 text-base">{averageStarsDisplay}</div>
              <span className="text-sm font-medium text-convot-charcoal">
                {ratingAverage == null ? "—" : Number(ratingAverage).toFixed(1)}
              </span>
              <span className="text-sm text-neutral-500">
                ({ratingTotal == null ? "—" : ratingTotal} đánh giá)
              </span>
              <span className="hidden h-4 w-px bg-neutral-300 sm:inline" aria-hidden />
              <span className="text-sm text-neutral-500">{product.soldCount ?? 0} đã bán</span>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 border-y border-neutral-200/80 py-5 sm:grid-cols-2">
              <div className="flex items-center gap-3 text-sm text-neutral-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm">
                  <FaShippingFast />
                </div>
                <span>Miễn phí vận chuyển toàn quốc</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm">
                  <FaShieldAlt />
                </div>
                <span>Đổi trả trong 30 ngày</span>
              </div>
            </div>

            {!isOutOfStock && (
              <p className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-800">
                <FaCheckCircle className="text-emerald-600" /> Còn hàng
              </p>
            )}

            {hasVariants && !isAccessoryProduct && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Kích cỡ</span>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-convot-charcoal hover:text-convot-charcoal"
                  >
                    <FaRulerCombined className="text-[11px]" />
                    Hướng dẫn chọn size
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => {
                    const allVariantsInSize = product.variants.filter(vv => String(getVariantSizeLabel(vv)) === String(size));
                    const isTotalOutOfStock = allVariantsInSize.every(vv => (vv.stock ?? 0) <= 0);
                    
                    const variantWithCurrentColor = allVariantsInSize.find(vv => String(getVariantColorLabel(vv)) === String(selectedColor));
                    const isUnavailableInCurrentColor = !variantWithCurrentColor || (variantWithCurrentColor.stock ?? 0) <= 0;
                    
                    const isSelected = String(selectedSize) === String(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeClick(String(size))}
                        disabled={isTotalOutOfStock}
                        className={`flex h-12 min-w-[3rem] items-center justify-center rounded-full border px-4 text-sm font-semibold transition-all ${
                          isSelected
                            ? "border-convot-charcoal bg-convot-charcoal text-white"
                            : isTotalOutOfStock
                              ? "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-200 line-through opacity-50"
                              : isUnavailableInCurrentColor
                                ? "border-neutral-200 bg-white text-neutral-400 opacity-60 hover:border-convot-charcoal"
                                : "border-neutral-300 bg-white text-neutral-700 hover:border-convot-charcoal"
                        }`}
                      >
                        {formatVariantButtonLabel(size, "size")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasVariants && availableColors.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Màu sắc</span>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                    {selectedColor || availableColors[0]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => {
                    const allVariantsInColor = product.variants.filter(vv => String(getVariantColorLabel(vv)) === String(color));
                    const isTotalOutOfStock = allVariantsInColor.every(vv => (vv.stock ?? 0) <= 0);

                    const variantWithCurrentSize = allVariantsInColor.find(vv => String(getVariantSizeLabel(vv)) === String(selectedSize));
                    const isUnavailableInCurrentSize = !variantWithCurrentSize || (variantWithCurrentSize.stock ?? 0) <= 0;

                    const isSelected = String(selectedColor || "") === String(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorClick(String(color))}
                        disabled={isTotalOutOfStock}
                        className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all ${
                          isSelected
                            ? "border-convot-charcoal bg-convot-charcoal text-white"
                            : isTotalOutOfStock
                              ? "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-200 line-through opacity-50"
                              : isUnavailableInCurrentSize
                                ? "border-neutral-200 bg-white text-neutral-400 opacity-60 hover:border-convot-charcoal"
                                : "border-neutral-300 bg-white text-neutral-700 hover:border-convot-charcoal"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-white" : isUnavailableInCurrentSize ? "bg-neutral-300" : "bg-neutral-400"}`} />
                        {formatVariantButtonLabel(color, "color")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex h-12 items-center overflow-hidden rounded-full border border-neutral-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="flex h-full w-11 items-center justify-center text-neutral-500 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  −
                </button>
                <div className="flex h-full w-10 items-center justify-center text-sm font-semibold text-convot-charcoal">{quantity}</div>
                <button
                  type="button"
                  onClick={() => {
                    if (!canIncreaseQty) {
                      setQtyNotice(isOutOfStock ? "Sản phẩm hiện đã hết hàng" : "Đã đạt số lượng tối đa kho");
                      return;
                    }
                    setQuantity((q) => Math.min(Math.max(1, maxSelectableQty || 1), q + 1));
                  }}
                  className="flex h-full w-11 items-center justify-center text-neutral-500 transition hover:bg-neutral-50"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-neutral-500">{Math.max(0, maxSelectableQty)} sản phẩm có sẵn</span>
            </div>

            {qtyNotice && <p className="mt-3 text-sm font-medium text-red-600">{qtyNotice}</p>}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={checkingStock || isOutOfStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-convot-charcoal py-3.5 text-sm font-semibold text-convot-charcoal transition hover:bg-convot-charcoal hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaShoppingCart /> Thêm vào giỏ
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={checkingStock || isOutOfStock}
                className="flex-[1.2] rounded-full bg-convot-charcoal py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mua ngay
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isFavorited ? "border-red-500 bg-red-50 text-red-500" : "border-neutral-200 text-neutral-400 hover:border-red-300 hover:text-red-400"
                }`}
              >
                {isFavorited ? <FaHeart size={22} /> : <FaRegHeart size={22} />}
              </button>
            </div>
          </div>
        </div>

        <section className="mt-10 w-full lg:mt-12" aria-label="Thông tin và đánh giá">
            <div className="border-b border-neutral-200">
              <div className="flex gap-6 overflow-x-auto no-scrollbar">
                {[
                  { key: "story", label: "Thông tin sản phẩm" },
                  { key: "review", label: `Đánh giá (${ratingTotal == null ? "—" : ratingTotal})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative whitespace-nowrap pb-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                      activeTab === tab.key ? "text-convot-charcoal" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <span className="absolute bottom-0 left-0 h-[3px] w-full bg-convot-charcoal" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 min-h-[200px]">
            {activeTab === "story" && (
              <div className="rounded-xl border border-neutral-200/90 bg-white px-5 py-6 shadow-sm sm:px-6">
                {product.description ? (
                  <div
                    className="product-description max-w-none"
                    dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, "<br/>") }}
                  />
                ) : (
                  <p className="text-center font-body text-sm italic text-neutral-400">
                    Mô tả đang được cập nhật.
                  </p>
                )}
              </div>
            )}

            {activeTab === "review" && (
              <div className="max-w-none">
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 bg-slate-50/80 px-4 py-3">
                    <h4 className="font-display text-sm font-black uppercase tracking-wide text-slate-800">
                      Đánh giá sản phẩm
                    </h4>
                  </div>
                  <div className="border-b border-neutral-100 px-4 py-5 md:px-5">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="shrink-0">
                      <p
                        className="font-display text-2xl md:text-3xl font-black leading-tight"
                        style={{ color: REVIEW_ACCENT }}
                      >
                        {ratingAverage == null ? "—" : Number(ratingAverage).toFixed(1)}{" "}
                        <span className="text-base md:text-lg font-bold text-slate-800">trên 5</span>
                      </p>
                      <div
                        className="flex gap-0.5 mt-2 text-lg md:text-xl"
                        style={{ color: REVIEW_ACCENT }}
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
                            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                              reviewListFilter === chip.id
                                ? "border-convot-charcoal text-convot-charcoal bg-white shadow-sm"
                                : "border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300"
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
                          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                            reviewListFilter === "media"
                              ? "border-convot-charcoal text-convot-charcoal bg-white shadow-sm"
                              : "border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300"
                          }`}
                        >
                          Có Hình Ảnh / Video
                        </button>
                      </div>
                    </div>
                  </div>
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
                                        style={{ color: i < r.rating ? REVIEW_ACCENT : "#e5e7eb" }}
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
                                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-convot-charcoal transition-colors"
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
        </section>

        <section className="mt-12 w-full border-t border-neutral-200 pt-10">
              <h3 className="font-display text-base font-semibold tracking-wide text-convot-charcoal">
                Các sản phẩm khác
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                Sản phẩm gợi ý liên quan — bạn có thể quan tâm.
              </p>
              {relatedLoading ? (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                  {[...Array(8)].map((_, k) => (
                    <div key={k} className="aspect-square animate-pulse rounded-xl bg-neutral-200" />
                  ))}
                </div>
              ) : (relatedProducts || []).length === 0 ? (
                <p className="mt-6 text-sm text-neutral-500">
                  Chưa có gợi ý.{" "}
                  <Link to="/product" className="font-semibold text-convot-charcoal underline">
                    Xem tất cả sản phẩm
                  </Link>
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {(relatedProducts || []).slice(0, 8).map((p) => {
                    const img = p?.image || p?.srcImages?.[0] || "";
                    const priceInfo = getProductPriceInfo(p);
                    return (
                      <Link
                        key={p._id}
                        to={`/product/${p._id}`}
                        className="group block"
                      >
                        <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
                          <img
                            src={getImage(img)}
                            alt={p.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-center text-xs font-medium text-convot-charcoal group-hover:underline md:text-sm">
                          {p.name}
                        </p>
                        <p className="mt-0.5 text-center text-xs text-neutral-500 tabular-nums">
                          {Number(priceInfo.effectivePrice).toLocaleString("vi-VN")}đ
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
        </section>

      </div>

      {!isAccessoryProduct && showSizeGuide && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setShowSizeGuide(false)}>
          <div
            className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 font-body shadow-2xl md:p-8"
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
            <div className="pr-14">
              <SizeGuideInner />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;