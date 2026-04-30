import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
import {
  addToCartAPI, fetchProducts, getMyReviewsByProduct, getProductById,
  getProductRecommendations, getProductReviews, getStocks, trackViewedProduct,
} from "../../api";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";
import { FaStar, FaStarHalfAlt, FaShoppingCart, FaCheckCircle, FaShippingFast, FaShieldAlt, FaHeart, FaRegHeart, FaRulerCombined, FaTimes, FaThumbsUp, FaChevronDown } from "react-icons/fa";
import { getProductPriceInfo } from "../../utils/pricing.js";
import notify from "../../utils/notify";
import {
  getOrderStatusLabelForReview,
  shouldShowOrderStatusOnReview,
} from "../../utils/orderStatusForReview";
import SizeGuideInner from "../../components/SizeGuide/SizeGuideInner";
import RecommendSection from "../../components/RecommendSection/RecommendSection";

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
  /** ObjectId màu hoặc khóa n:name (sản phẩm cũ chỉ có attributes) */
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [activeTab, setActiveTab] = useState("story");
  const [mainImage, setMainImage] = useState("");
  /** Tăng mỗi khi đổi size để chạy animation phóng ảnh một lần */
  const [sizeZoomNonce, setSizeZoomNonce] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  /** all | 1..5 | comment | media */
  const [reviewListFilter, setReviewListFilter] = useState("all");

  const [checkingStock, setCheckingStock] = useState(false);
  const [stockInfo, setStockInfo] = useState(null);
  const [qtyNotice, setQtyNotice] = useState("");
  const relatedSectionRef = useRef(null);
  const previousVisualSelectionRef = useRef("");

  /** Lưu cục bộ để API /recommend loại SP vừa xem (khách không đăng nhập) */
  useEffect(() => {
    if (!id) return;
    try {
      const key = "sh_recent_products_v1";
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      const next = [id, ...arr.filter((x) => String(x) !== String(id))].slice(0, 24);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [id]);

  const recommendUserId =
    user?.login ? String(user._id || user.id || "") : null;

  const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";

  const getImage = (img) => {
    if (!img) return PLACEHOLDER_IMG;
    if (typeof img !== "string") return PLACEHOLDER_IMG;
    if (img.startsWith("http")) return img;
    return `http://localhost:3002/uploads/${img.startsWith("/") ? img.slice(1) : img}`;
  };

  const getVariantSizeValue = useCallback((variant) => {
    if (variant?.size != null && String(variant.size).trim() !== "") {
      return String(variant.size).trim();
    }
    const attrs = variant?.attributes;
    if (!attrs) return null;
    const normalizeAttrKey = (k) =>
      String(k || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
    const wanted = new Set(["Size", "size"].map(normalizeAttrKey));
    const entries = typeof attrs.entries === "function" ? Array.from(attrs.entries()) : Object.entries(attrs);
    for (const [k, v] of entries) {
      if (!wanted.has(normalizeAttrKey(k))) continue;
      if (v != null && String(v).trim() !== "") return v;
    }
    return null;
  }, []);

  const getVariantSizeLabel = useCallback((variant) => {
    const val = getVariantSizeValue(variant);
    return val != null ? String(val) : variant?.sku ?? "";
  }, [getVariantSizeValue]);

  const getVariantColorValue = useCallback((variant) => {
    if (variant?.colorName != null && String(variant.colorName).trim() !== "") {
      return String(variant.colorName).trim();
    }
    const attrs = variant?.attributes;
    if (!attrs) return null;
    const normalizeAttrKey = (k) =>
      String(k || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
    const wanted = new Set(["Color", "color", "Màu", "Mau"].map(normalizeAttrKey));
    const entries = typeof attrs.entries === "function" ? Array.from(attrs.entries()) : Object.entries(attrs);
    for (const [k, v] of entries) {
      if (!wanted.has(normalizeAttrKey(k))) continue;
      if (v != null && String(v).trim() !== "") return v;
    }
    return null;
  }, []);

  const getVariantColorLabel = useCallback((variant) => {
    const val = getVariantColorValue(variant);
    return val != null ? String(val) : "";
  }, [getVariantColorValue]);

  const normalizeVariantValue = useCallback((value) => {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }, []);

  const getVariantColorKeyStable = useCallback(
    (v) => {
      const oid = v?.colorId?._id ?? v.colorId;
      if (oid && /^[a-f\d]{24}$/i.test(String(oid))) return String(oid);
      const nm = String(v?.colorName ?? "").trim();
      if (nm) return `n:${normalizeVariantValue(nm)}`;
      const cv = getVariantColorValue(v);
      return cv ? `n:${normalizeVariantValue(cv)}` : "";
    },
    [getVariantColorValue, normalizeVariantValue],
  );

  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
  const isAccessoryProduct = String(
    product?.categoryId?.slug ||
      product?.categoryId?.name ||
      product?.category ||
      "",
  )
    .toLowerCase()
    .includes("phụ kiện");

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

  useEffect(() => {
    setSelectedColorId(null);
    setSelectedSize(null);
    setQuantity(1);
  }, [id]);

  const colorOptions = useMemo(() => {
    if (!product || !hasVariants || !Array.isArray(product.variants)) return [];
    const map = new Map();
    for (const v of product.variants) {
      const cid = getVariantColorKeyStable(v);
      if (!cid) continue;
      if (!map.has(cid)) {
        const name =
          String(v?.colorName ?? getVariantColorLabel(v) ?? "").trim() || "Màu";
        const hex =
          String(v?.colorHex ?? "").trim() ||
          (typeof v.colorId === "object" && v.colorId?.code
            ? String(v.colorId.code)
            : "");
        const same = product.variants.filter((x) => getVariantColorKeyStable(x) === cid);
        const allOOS = same.every((x) => (x?.stock ?? 0) <= 0 || x?.isActive === false);
        map.set(cid, { id: cid, name, hex, allOOS });
      }
    }
    return [...map.values()];
  }, [product, hasVariants, getVariantColorKeyStable, getVariantColorLabel]);

  const sizesForSelectedColor = useMemo(() => {
    if (!product || !hasVariants || !selectedColorId) return [];
    const labels = product.variants
      .filter((v) => getVariantColorKeyStable(v) === selectedColorId)
      .map((v) => getVariantSizeLabel(v))
      .filter((s) => s != null && String(s).trim() !== "");
    return [...new Set(labels.map((s) => String(s)))];
  }, [product, hasVariants, selectedColorId, getVariantColorKeyStable, getVariantSizeLabel]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants || !selectedSize || !selectedColorId || !Array.isArray(product?.variants)) {
      return null;
    }
    return (
      product.variants.find((v) => {
        const sz = getVariantSizeLabel(v);
        return (
          getVariantColorKeyStable(v) === selectedColorId &&
          sz != null &&
          normalizeVariantValue(sz) === normalizeVariantValue(selectedSize)
        );
      }) || null
    );
  }, [
    product,
    selectedSize,
    selectedColorId,
    hasVariants,
    getVariantSizeLabel,
    getVariantColorKeyStable,
    normalizeVariantValue,
  ]);

  const selectedSku = selectedVariant?.sku ?? null;
  const selectedSizeValue = getVariantSizeValue(selectedVariant) ?? null;

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    if (!hasVariants) return getProductPriceInfo(product).effectivePrice;
    if (selectedVariant) return getProductPriceInfo(product, selectedVariant).effectivePrice;
    if (selectedColorId) {
      const list = product.variants.filter((v) => getVariantColorKeyStable(v) === selectedColorId);
      const prices = list
        .map((v) => getProductPriceInfo(product, v).effectivePrice)
        .filter((p) => Number(p) > 0);
      if (prices.length) return Math.min(...prices);
    }
    const all = product.variants.map((v) => getProductPriceInfo(product, v).effectivePrice);
    const pos = all.filter((p) => Number(p) > 0);
    return pos.length ? Math.min(...pos) : 0;
  }, [product, hasVariants, selectedVariant, selectedColorId, getVariantColorKeyStable]);

  const selectedPriceInfo = useMemo(() => {
    if (!product) return { originalPrice: 0, effectivePrice: 0, hasSale: false, discountPercent: 0 };
    if (!hasVariants) return getProductPriceInfo(product);
    if (selectedVariant) return getProductPriceInfo(product, selectedVariant);
    if (selectedColorId) {
      const list = product.variants.filter((v) => getVariantColorKeyStable(v) === selectedColorId);
      const first = list[0];
      if (first) return getProductPriceInfo(product, first);
    }
    const first = product.variants?.[0];
    return getProductPriceInfo(product, first || null);
  }, [product, hasVariants, selectedVariant, selectedColorId, getVariantColorKeyStable]);

  /** Trung bình sao từ API (đánh giá hiển thị công khai); khi chưa tải xong thì tạm dùng dữ liệu sản phẩm nếu có */
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
    const normalizeForMatch = (value) =>
      String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const selectedOpt = colorOptions.find((c) => c.id === selectedColorId);
    const selectedColorNormalized = selectedOpt ? normalizeForMatch(selectedOpt.name) : "";

    const fromProduct = [
      product.image,
      ...(Array.isArray(product.srcImages) ? product.srcImages : []),
    ].filter(Boolean);

    const fromVariant = selectedVariant
      ? [
          ...(Array.isArray(selectedVariant.images) ? selectedVariant.images : []),
          selectedVariant.image,
        ].filter(Boolean)
      : [];

    const fromSameColorVariants =
      !fromVariant.length && selectedColorId && Array.isArray(product?.variants)
        ? product.variants
            .filter((v) => getVariantColorKeyStable(v) === selectedColorId)
            .flatMap((v) => [
              ...(Array.isArray(v?.images) ? v.images : []),
              v?.image,
            ])
            .filter(Boolean)
        : [];

    const fromColorMatchedProduct =
      !fromVariant.length && !fromSameColorVariants.length && selectedColorNormalized
        ? fromProduct.filter((img) =>
            normalizeForMatch(img).includes(selectedColorNormalized),
          )
        : [];

    const merged = [
      ...fromVariant,
      ...fromSameColorVariants,
      ...fromColorMatchedProduct,
      ...fromProduct,
    ];
    return Array.from(new Set(merged));
  }, [
    product,
    selectedVariant,
    selectedColorId,
    colorOptions,
    getVariantColorKeyStable,
  ]);

  /** Khi đổi size/màu (SKU), cập nhật ảnh chính theo gallery biến thể; giữ ảnh đang xem nếu vẫn còn trong danh sách. */
  useEffect(() => {
    if (!product || thumbnails.length === 0) return;
    const currentSelectionKey = `${String(selectedSku || "")}::${String(selectedColorId || "")}`;
    const selectionChanged =
      previousVisualSelectionRef.current !== currentSelectionKey;
    previousVisualSelectionRef.current = currentSelectionKey;

    setMainImage((prev) => {
      if (selectionChanged) return thumbnails[0];
      return prev && thumbnails.includes(prev) ? prev : thumbnails[0];
    });
  }, [product, thumbnails, selectedSku, selectedColorId]);

  const handleSizeClick = (size) => {
    const next = String(size);
    if (normalizeVariantValue(selectedSize ?? "") !== normalizeVariantValue(next)) {
      setSizeZoomNonce((n) => n + 1);
    }
    setSelectedSize(next);
  };

  /** Bước 1: chọn màu — reset size để khách chọn lại cỡ. */
  const handleColorClick = (colorId) => {
    setSelectedColorId(colorId);
    setSelectedSize(null);
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
        setReviewStats(null);
      } finally {
        setReviewsLoading(false);
      }
    };
    run();
  }, [product, user?.login, reviewListFilter]);

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
    const colorToSave = hasVariants
      ? String(selectedVariant?.colorName ?? getVariantColorLabel(selectedVariant) ?? "").trim() || null
      : null;
    const variantLineImage =
      hasVariants && selectedVariant
        ? (Array.isArray(selectedVariant.images) && selectedVariant.images[0]) || product.image
        : product.image;
    const variantIdToSave = hasVariants ? selectedVariant?._id ?? null : null;
    const colorHexToSave = hasVariants ? selectedVariant?.colorHex ?? null : null;

    if (hasVariants && (!selectedColorId || !selectedSize || !skuToSave)) {
      notify.warning("Vui lòng chọn màu và kích cỡ.");
      return false;
    }
    if (stockInfo?.available === false) { notify.warning("Sản phẩm đã hết, vui lòng mua sản phẩm khác."); return false; }

    const maxStock = Number(stockInfo?.countInStock ?? 0);
    if (!Number.isFinite(maxStock) || maxStock <= 0) {
      notify.warning("Sản phẩm đã hết, vui lòng mua sản phẩm khác.");
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
      productId: product._id,
      name: product.name,
      image: variantLineImage,
      price: displayPrice,
      originalPrice: Number(selectedPriceInfo.originalPrice || displayPrice),
      qty: qtySafe,
      sku: skuToSave,
      size: sizeToSave,
      color: colorToSave,
      variantId: variantIdToSave,
      colorName: colorToSave,
      colorHex: colorHexToSave,
    }));

    try {
      if (user?.login && user?.id) {
        await addToCartAPI({
          userId: user.id,
          productId: product._id,
          qty: qtySafe,
          sku: skuToSave ?? null,
          size: sizeToSave ?? null,
          color: colorToSave ?? null,
          image: variantLineImage,
          variantId: variantIdToSave,
          colorHex: colorHexToSave,
        });
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
    if (!user?.login || !user?.token) {
      notify.warning("Vui lòng đăng nhập để thêm sản phẩm vào yêu thích.");
      navigate("/login", { state: { from: `/product/${product._id}` } });
      return;
    }
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
    const colorToSave = hasVariants
      ? String(selectedVariant?.colorName ?? getVariantColorLabel(selectedVariant) ?? "").trim() || null
      : null;
    const variantLineImage =
      hasVariants && selectedVariant
        ? (Array.isArray(selectedVariant.images) && selectedVariant.images[0]) || product.image
        : product.image;
    const variantIdToSave = hasVariants ? selectedVariant?._id ?? null : null;
    const colorHexToSave = hasVariants ? selectedVariant?.colorHex ?? null : null;

    if (hasVariants && (!selectedColorId || !selectedSize || !skuToSave)) {
      notify.warning("Vui lòng chọn màu và kích cỡ.");
      return;
    }
    if (stockInfo?.available === false) {
      notify.warning("Sản phẩm đã hết, vui lòng mua sản phẩm khác.");
      return;
    }

    const maxStock = Number(stockInfo?.countInStock ?? 0);
    if (!Number.isFinite(maxStock) || maxStock <= 0) {
      notify.warning("Sản phẩm đã hết, vui lòng mua sản phẩm khác.");
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
      image: variantLineImage,
      price: displayPrice,
      originalPrice: Number(selectedPriceInfo.originalPrice || displayPrice),
      qty: qtySafe,
      sku: skuToSave,
      size: sizeToSave,
      color: colorToSave,
      variantId: variantIdToSave,
      colorName: colorToSave,
      colorHex: colorHexToSave,
    };
    const buyNowAction = addToCart({
      ...buyNowItem,
      noMerge: true,
    });
    buyNowAction.meta = { notify: false };
    dispatch(buyNowAction);

    navigate("/checkout", {
      state: {
        selectedItemKeys: [buyNowCartKey],
        buyNowItem,
      },
    });
  };

  const variantSelectionIncomplete =
    hasVariants && (!selectedColorId || !selectedSize || !selectedVariant);
  const stockStatePending =
    hasVariants &&
    (!selectedColorId ||
      !selectedSize ||
      !selectedSku ||
      checkingStock ||
      stockInfo == null);
  const stockCountDisplay = stockStatePending
    ? null
    : (stockInfo?.countInStock ?? product?.countInStock ?? product?.stock ?? 0);
  const maxSelectableQty = Math.max(
    0,
    Number(stockCountDisplay ?? product?.countInStock ?? product?.stock ?? 0),
  );
  const canIncreaseQty = maxSelectableQty <= 0 ? false : quantity < maxSelectableQty;
  const isOutOfStock = !stockStatePending && (maxSelectableQty <= 0 || stockInfo?.available === false);
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

  const scrollToRelatedProducts = () => {
    relatedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
                <div
                  key={sizeZoomNonce}
                  className={`h-full w-full origin-center${sizeZoomNonce > 0 ? " animate-sizePickZoom" : ""}`}
                >
                  <img
                    src={getImage(mainImage)}
                    onError={(e) => {
                      e.target.src = PLACEHOLDER_IMG;
                    }}
                    className="h-full w-full object-cover transition duration-700 ease-out hover:scale-[1.02]"
                    alt={product.name}
                  />
                </div>
                {isOutOfStock && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20">
                    <span className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-black/65 px-3 text-center text-xl font-semibold text-white shadow-lg">
                      Hết hàng
                    </span>
                  </div>
                )}
                {product.isNew && (
                  <span className="absolute left-5 top-5 rounded-full bg-convot-charcoal px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                    Mới
                  </span>
                )}
                <button
                  type="button"
                  onClick={scrollToRelatedProducts}
                  className="absolute bottom-4 left-4 z-30 inline-flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2 text-sm font-semibold text-convot-charcoal shadow-md transition hover:bg-white"
                >
                  <span className="text-red-500">🛍️</span>
                  Sản phẩm tương tự
                </button>
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
            {isOutOfStock && (
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-red-600">
                Hết hàng
              </p>
            )}

            {hasVariants && !isAccessoryProduct && colorOptions.length > 0 && (
              <div className="mt-8 font-['Lexend',sans-serif]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Bước 1 — Màu sắc
                  </span>
                  <span className="rounded-[12px] bg-[#FFF5E6] px-2.5 py-1 text-[11px] font-semibold text-[#f49d25]">
                    {colorOptions.find((c) => c.id === selectedColorId)?.name || "Chưa chọn"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((opt) => {
                    const isSelected = selectedColorId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleColorClick(opt.id)}
                        disabled={opt.allOOS}
                        className={`inline-flex h-11 items-center gap-2 rounded-[12px] border px-3 text-sm font-semibold transition-all ${
                          isSelected
                            ? "border-[#f49d25] bg-[#f49d25] text-white shadow-sm"
                            : opt.allOOS
                              ? "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 line-through opacity-60"
                              : "border-neutral-200 bg-white text-neutral-800 hover:border-[#f49d25]"
                        }`}
                      >
                        <span
                          className="h-5 w-5 shrink-0 rounded-[8px] border border-black/10"
                          style={{ background: opt.hex || "#e2e8f0" }}
                          aria-hidden
                        />
                        <span>{opt.name}</span>
                        {opt.allOOS ? (
                          <span className="ml-1 text-[10px] font-bold uppercase text-red-500">Hết hàng</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasVariants && !isAccessoryProduct && (
              <div className="mt-8 font-['Lexend',sans-serif]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Bước 2 — Kích cỡ
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="inline-flex items-center gap-2 rounded-[12px] border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-[#f49d25] hover:text-[#f49d25]"
                  >
                    <FaRulerCombined className="text-[11px]" />
                    Hướng dẫn chọn size
                  </button>
                </div>
                {!selectedColorId ? (
                  <p className="text-sm text-neutral-500">Vui lòng chọn màu trước.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sizesForSelectedColor.map((size) => {
                      const cellVariant = product.variants.find((vv) => {
                        const sz = getVariantSizeLabel(vv);
                        return (
                          getVariantColorKeyStable(vv) === selectedColorId &&
                          sz != null &&
                          normalizeVariantValue(sz) === normalizeVariantValue(size)
                        );
                      });
                      const cellStock = Number(cellVariant?.stock ?? 0);
                      const noStock = cellStock <= 0 || cellVariant?.isActive === false;
                      const isSelected =
                        selectedSize != null &&
                        normalizeVariantValue(selectedSize) === normalizeVariantValue(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleSizeClick(String(size))}
                          disabled={noStock}
                          className={`flex h-12 min-w-[3rem] items-center justify-center rounded-[12px] border px-4 text-sm font-semibold transition-all ${
                            isSelected
                              ? "border-[#f49d25] bg-[#f49d25] text-white shadow-sm"
                              : noStock
                                ? "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 line-through opacity-60"
                                : "border-neutral-200 bg-white text-neutral-800 hover:border-[#f49d25]"
                          }`}
                        >
                          {formatVariantButtonLabel(size, "size")}
                        </button>
                      );
                    })}
                  </div>
                )}
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
              <span className="text-sm text-neutral-500">
                {stockStatePending
                  ? "Đang kiểm tra tồn kho..."
                  : `${Math.max(0, maxSelectableQty)} sản phẩm có sẵn`}
              </span>
            </div>

            {qtyNotice && <p className="mt-3 text-sm font-medium text-red-600">{qtyNotice}</p>}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={checkingStock || isOutOfStock || variantSelectionIncomplete}
                className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[#f49d25] py-3.5 text-sm font-semibold text-[#c9780a] transition hover:bg-[#f49d25] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 font-['Lexend',sans-serif]"
              >
                <FaShoppingCart /> Thêm vào giỏ
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={checkingStock || isOutOfStock || variantSelectionIncomplete}
                className="flex-[1.2] rounded-[12px] bg-[#f49d25] py-3.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 font-['Lexend',sans-serif]"
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

        <div className="mt-12 w-full">
          <RecommendSection
            userId={recommendUserId || undefined}
            productId={id || undefined}
          />
        </div>

        <section ref={relatedSectionRef} className="mt-12 w-full border-t border-neutral-200 pt-10">
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