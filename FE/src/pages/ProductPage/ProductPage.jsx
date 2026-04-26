import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaHeart, FaRegHeart, FaEye, FaStar } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProducts,
  getAllCategories,
  getReviewStatsByProduct,
  getVoucherByCode,
} from "../../api";
import { getProductPriceInfo } from "../../utils/pricing.js";
import { getVariantColorValue, getVariantSizeValue } from "../../utils/variantAttributes";
import { isProductOutOfStock } from "../../utils/stock.js";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";
import notify from "../../utils/notify";

const PAGE_SIZE = 12;

const categoryNameToSlug = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const isAccessoryCategory = (c) => {
  const slugFromDb =
    c?.slug != null && String(c.slug).trim() !== ""
      ? String(c.slug).trim().toLowerCase()
      : null;
  if (slugFromDb === "phu-kien") return true;
  return categoryNameToSlug(c?.name || "") === "phu-kien";
};

const getProductMinPrice = (product) => {
  const pr = product?.priceRange;
  if (pr && (pr.min != null || pr.max != null)) return Number(pr.min ?? 0) || 0;
  if (typeof product?.price === "number") return product.price;
  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    const prices = product.variants
      .map((v) => Number(v?.price))
      .filter((n) => Number.isFinite(n));
    if (prices.length > 0) return Math.min(...prices);
  }
  return 0;
};

const normalizeValue = (value) => String(value || "").trim().toLowerCase().normalize("NFC");

const getProductSizes = (product) => {
  const sizes = [];
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant) => {
      const fromAttrs = getVariantSizeValue(variant);
      const candidate = fromAttrs ?? variant?.size ?? variant?.sizeName;
      if (candidate != null && String(candidate).trim() !== "") {
        sizes.push(String(candidate).trim());
      }
    });
  }
  if (product?.size != null && String(product.size).trim() !== "") {
    sizes.push(String(product.size).trim());
  }
  return [...new Set(sizes)];
};

const getProductColors = (product) => {
  const colors = [];
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant) => {
      const fromAttrs = getVariantColorValue(variant);
      const candidate = fromAttrs ?? variant?.color ?? variant?.colorName;
      if (candidate != null && String(candidate).trim() !== "") {
        colors.push(String(candidate).trim());
      }
    });
  }
  if (product?.color != null && String(product.color).trim() !== "") {
    colors.push(String(product.color).trim());
  }
  return [...new Set(colors)];
};

const isProductOnRealSale = (product) => {
  if (!product) return false;
  const amount = (value) => Number(value) || 0;
  if (amount(product.saleDiscountAmount) > 0) return true;
  if (
    Array.isArray(product.variants) &&
    product.variants.some((variant) => amount(variant?.saleDiscountAmount) > 0)
  ) {
    return true;
  }
  return false;
};

const matchRatingFilter = (product, selectedRating) => {
  if (!selectedRating) return true;
  const currentRating = Number(
    product?.rating ??
      product?.averageRating ??
      product?.avgRating ??
      product?.reviewStats?.average ??
      0,
  );
  if (selectedRating === "5") return currentRating === 5;
  const minRating = Number(selectedRating);
  if (!Number.isFinite(minRating)) return true;
  return currentRating >= minRating && currentRating < 5;
};

const getResolvedProductRating = (product, ratingMap = {}) => {
  const id = String(product?._id || "");
  const fromStats = Number(ratingMap[id]);
  if (Number.isFinite(fromStats) && fromStats > 0) return fromStats;
  const fromProduct = Number(
    product?.rating ??
      product?.averageRating ??
      product?.avgRating ??
      product?.reviewStats?.average ??
      0,
  );
  return Number.isFinite(fromProduct) ? fromProduct : 0;
};

const ProductPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const user = useSelector((state) => state.user);
  const [products, setProducts] = useState([]);
  const [productRatingMap, setProductRatingMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [voucherScope, setVoucherScope] = useState(null);
  const [sidebarCategories, setSidebarCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [categoryLabel, setCategoryLabel] = useState("TẤT CẢ SẢN PHẨM");

  const [sort, setSort] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [rating, setRating] = useState("");
  const [minPriceFilter, setMinPriceFilter] = useState(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState(0);

  const categorySlug = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("category");
    return raw ? raw.trim().toLowerCase() : "";
  }, [location.search]);

  const segment = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("segment");
    return raw ? raw.trim().toLowerCase() : "";
  }, [location.search]);

  useEffect(() => {
    if (categorySlug === "phu-kien") {
      navigate("/phu-kien", { replace: true });
    }
  }, [categorySlug, navigate]);

  useEffect(() => {
    if (categorySlug === "phu-kien") return;
    const load = async () => {
      try {
        setLoading(true);
        if (categorySlug) setCategoryFilter("");
        const payload = { limit: 200, page: 0 };
        const catRes = await getAllCategories("active");
        const categories = Array.isArray(catRes?.data) ? catRes.data : [];

        const accessoryCategory = categories.find((c) => isAccessoryCategory(c));
        if (categorySlug) {
          const match = categories.find((c) => {
            const slugFromDb =
              c?.slug != null && String(c.slug).trim() !== ""
                ? String(c.slug).trim().toLowerCase()
                : null;
            if (slugFromDb && slugFromDb === categorySlug) return true;
            return categoryNameToSlug(c?.name || "") === categorySlug;
          });
          if (match?._id) {
            payload.categoryId = match._id;
            setCategoryLabel((match.name || "Sản phẩm").toUpperCase());
          } else {
            setProducts([]);
            setCategoryLabel("TẤT CẢ SẢN PHẨM");
          }
        } else {
          setCategoryLabel("TẤT CẢ SẢN PHẨM");
        }

        let forSidebar = Array.isArray(categories) ? [...categories] : [];
        if (segment === "products") {
          forSidebar = forSidebar.filter((c) => !isAccessoryCategory(c));
          if (!categorySlug) setCategoryLabel("TẤT CẢ SẢN PHẨM");
        }
        setSidebarCategories(
          forSidebar.sort((a, b) =>
            String(a?.name || "").localeCompare(String(b?.name || ""), "vi"),
          ),
        );

        const res = await fetchProducts(payload);
        let nextProducts = res?.data ?? res ?? [];
        if (!categorySlug && segment === "products" && accessoryCategory?._id) {
          nextProducts = nextProducts.filter(
            (p) => String(p?.categoryId?._id ?? p?.categoryId ?? "") !== String(accessoryCategory._id),
          );
        }
        setProducts(nextProducts);
      } catch (error) {
        console.error(error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categorySlug, segment]);

  useEffect(() => {
    const voucherCode = new URLSearchParams(location.search).get("voucher");
    if (!voucherCode) {
      setVoucherScope(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const voucher = await getVoucherByCode(voucherCode);
        if (!cancelled) setVoucherScope(voucher || null);
      } catch {
        if (!cancelled) setVoucherScope(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    const ids = (Array.isArray(products) ? products : [])
      .map((p) => String(p?._id || ""))
      .filter(Boolean)
      .filter((id) => productRatingMap[id] == null);
    if (!ids.length) return undefined;

    const loadRatingStats = async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const stats = await getReviewStatsByProduct(id);
            const avg = Number(stats?.data?.average ?? stats?.average ?? 0);
            return [id, Number.isFinite(avg) ? avg : 0];
          } catch {
            return [id, 0];
          }
        }),
      );
      if (cancelled) return;
      setProductRatingMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    };
    loadRatingStats();

    return () => {
      cancelled = true;
    };
  }, [products, productRatingMap]);

  const maxAvailablePrice = useMemo(() => {
    if (!products.length) return 0;
    return Math.max(...products.map((p) => getProductMinPrice(p)));
  }, [products]);
  const minRangePercent = useMemo(() => {
    const max = Number(maxAvailablePrice || 0);
    const val = Number(minPriceFilter || 0);
    if (!Number.isFinite(max) || max <= 0) return 0;
    const clamped = Math.min(Math.max(0, val), max);
    return Math.round((clamped / max) * 100);
  }, [maxAvailablePrice, minPriceFilter]);
  const maxRangePercent = useMemo(() => {
    const max = Number(maxAvailablePrice || 0);
    const val = Number(maxPriceFilter || 0);
    if (!Number.isFinite(max) || max <= 0) return 0;
    const clamped = Math.min(Math.max(0, val), max);
    return Math.round((clamped / max) * 100);
  }, [maxAvailablePrice, maxPriceFilter]);

  useEffect(() => {
    if (maxAvailablePrice > 0) {
      setMinPriceFilter(0);
      setMaxPriceFilter(maxAvailablePrice);
    }
  }, [maxAvailablePrice]);

  const availableSizes = useMemo(() => {
    const collected = products.flatMap((p) => getProductSizes(p));
    const unique = [...new Set(collected)];
    return unique.sort((a, b) => Number(a) - Number(b));
  }, [products]);

  const availableColors = useMemo(() => {
    const collected = products.flatMap((p) => getProductColors(p));
    return [...new Set(collected)].sort((a, b) => a.localeCompare(b, "vi"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let data = [...products];

    const applicableIds = Array.isArray(voucherScope?.applicableProductIds)
      ? voucherScope.applicableProductIds.map((id) => String(id))
      : [];
    if (applicableIds.length > 0) {
      data = data.filter((p) => applicableIds.includes(String(p?._id)));
    }

    if (categoryFilter) {
      data = data.filter(
        (p) => String(p?.categoryId?._id ?? p?.categoryId ?? "") === categoryFilter,
      );
    }

    if (selectedSize || selectedColor) {
      data = data.filter((p) => {
        if (selectedSize && selectedColor) {
          const hasMatchingVar = (p.variants || []).some((v) => {
            const vSize = getVariantSizeValue(v) || v.size || v.sizeName;
            const vColor = getVariantColorValue(v) || v.color || v.colorName;
            return (
              normalizeValue(vSize) === normalizeValue(selectedSize) &&
              normalizeValue(vColor) === normalizeValue(selectedColor)
            );
          });
          if (hasMatchingVar) return true;
          return (
            normalizeValue(p.size) === normalizeValue(selectedSize) &&
            normalizeValue(p.color) === normalizeValue(selectedColor)
          );
        }
        if (selectedSize) {
          return getProductSizes(p).some((s) => normalizeValue(s) === normalizeValue(selectedSize));
        }
        if (selectedColor) {
          return getProductColors(p).some((c) => normalizeValue(c) === normalizeValue(selectedColor));
        }
        return true;
      });
    }

    if (rating) {
      data = data.filter((p) =>
        matchRatingFilter(
          { ...p, rating: getResolvedProductRating(p, productRatingMap) },
          rating,
        ),
      );
    }

    if (maxPriceFilter > 0) {
      data = data.filter((p) => {
        const price = getProductMinPrice(p);
        if (minPriceFilter === 0 && maxPriceFilter >= maxAvailablePrice) return true;
        return price >= minPriceFilter && price <= maxPriceFilter;
      });
    }

    if (sort === "priceAsc") data.sort((a, b) => getProductMinPrice(a) - getProductMinPrice(b));
    if (sort === "priceDesc") data.sort((a, b) => getProductMinPrice(b) - getProductMinPrice(a));
    if (sort === "new") data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return data;
  }, [
    products,
    voucherScope,
    categoryFilter,
    selectedSize,
    selectedColor,
    rating,
    minPriceFilter,
    maxPriceFilter,
    sort,
    productRatingMap,
  ]);

  useEffect(() => {
    setPage(1);
  }, [sort, categoryFilter, selectedSize, selectedColor, rating, minPriceFilter, maxPriceFilter]);

  const totalPage = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const showProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAllFilter = () => {
    setSort("");
    setCategoryFilter("");
    setSelectedSize("");
    setSelectedColor("");
    setRating("");
    setMinPriceFilter(0);
    setMaxPriceFilter(maxAvailablePrice || 0);
  };

  const pageItems = useMemo(() => {
    if (totalPage <= 1) return [];
    if (totalPage <= 5) return Array.from({ length: totalPage }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "...", totalPage];
    if (page >= totalPage - 2) return [1, "...", totalPage - 2, totalPage - 1, totalPage];
    return [1, "...", page, "...", totalPage];
  }, [totalPage, page]);

  const getImageUrl = (img) => {
    if (!img || typeof img !== "string") return "";
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    if (img.startsWith("/uploads/")) return `http://localhost:3002${img}`;
    if (img.startsWith("uploads/")) return `http://localhost:3002/${img}`;
    return `http://localhost:3002/uploads/${img}`;
  };

  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((w) => String(w?._id))),
    [wishlistItems],
  );

  return (
    <main className="min-h-screen bg-[#f5f5f4] pt-12 pb-10 text-neutral-900">
      <style>{`
        .price-range-slider {
          position: relative;
          height: 18px;
        }
        .price-range-track {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, #dfe5e1 0%, #d3dbd5 100%);
          transform: translateY(-50%);
        }
        .price-range-selected {
          position: absolute;
          top: 50%;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, #4f6758 0%, #647d6d 100%);
          box-shadow: 0 2px 6px rgba(56, 73, 63, 0.22);
          transform: translateY(-50%);
          left: var(--min-pct);
          right: calc(100% - var(--max-pct));
        }
        .price-range-input {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          border-radius: 999px;
          background: transparent;
          outline: none;
          pointer-events: none;
        }
        .price-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #546d5d;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(40, 55, 47, 0.22), 0 0 0 2px rgba(255, 255, 255, 0.68);
          cursor: pointer;
          pointer-events: auto;
        }
        .price-range-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #546d5d;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(40, 55, 47, 0.22), 0 0 0 2px rgba(255, 255, 255, 0.68);
          cursor: pointer;
          pointer-events: auto;
        }
        .price-range-input::-moz-range-track {
          background: transparent;
        }
      `}</style>
      <section className="container mx-auto max-w-7xl px-4">
        <div className="mb-3 border-b border-neutral-200 pb-2">
          <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-black md:text-5xl lg:text-[2.75rem]">
            {categoryLabel}
          </h1>
          <p className="mt-1 max-w-2xl text-sm md:text-sm text-neutral-600">
            Khám phá bộ sưu tập giày cao cấp được tuyển chọn kỹ lưỡng, nơi phong cách đường dài gặp gỡ sự thoải mái tuyệt đối.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <aside className="w-full lg:w-[248px] lg:shrink-0 space-y-6">
            {!categorySlug && sidebarCategories.length > 0 && (
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Loại sản phẩm</h3>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="radio"
                      name="product-category-filter"
                      checked={categoryFilter === ""}
                      onChange={() => setCategoryFilter("")}
                      className="h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-neutral-300 transition-all checked:border-[#8ca587] checked:bg-[#8ca587] relative after:absolute after:left-1 after:top-0.5 after:hidden after:h-2 after:w-1 after:rotate-45 after:border-b-2 after:border-r-2 after:border-white checked:after:block after:content-['']"
                    />
                    Tất cả sản phẩm
                  </label>
                  {sidebarCategories.map((c) => {
                    const value = String(c?._id || "");
                    return (
                      <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="radio"
                          name="product-category-filter"
                          checked={categoryFilter === value}
                          onChange={() => setCategoryFilter(value)}
                          className="h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-neutral-300 transition-all checked:border-[#8ca587] checked:bg-[#8ca587] relative after:absolute after:left-1 after:top-0.5 after:hidden after:h-2 after:w-1 after:rotate-45 after:border-b-2 after:border-r-2 after:border-white checked:after:block after:content-['']"
                        />
                        {c?.name || "Danh mục"}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Giá</h3>
              <div className="mb-2 ml-auto w-fit rounded-lg border border-[#d9e0da] bg-[#f7faf8] px-2.5 py-1.5 text-right">
                <p className="text-[10px] font-medium tracking-[0.08em] text-[#708276]">Khoảng tiền</p>
                <p className="mt-0.5 text-xs font-semibold text-[#3f5648]">
                  {Number(minPriceFilter || 0).toLocaleString("vi-VN")}đ -{" "}
                  {Number(maxPriceFilter || 0).toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div
                className="price-range-slider"
                style={{ "--min-pct": `${minRangePercent}%`, "--max-pct": `${maxRangePercent}%` }}
              >
                <div className="price-range-track" />
                <div className="price-range-selected" />
                <input
                  type="range"
                  min={0}
                  max={maxAvailablePrice || 1}
                  value={minPriceFilter}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setMinPriceFilter(Math.min(next, maxPriceFilter));
                  }}
                  className="price-range-input"
                />
                <input
                  type="range"
                  min={0}
                  max={maxAvailablePrice || 1}
                  value={maxPriceFilter}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setMaxPriceFilter(Math.max(next, minPriceFilter));
                  }}
                  className="price-range-input"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-[#3f5648]">
                <span className="rounded-full border border-[#d9e0da] bg-[#f7faf8] px-2.5 py-1">
                  {Number(minPriceFilter || 0).toLocaleString("vi-VN")}đ
                </span>
                <span className="rounded-full border border-[#d9e0da] bg-[#f7faf8] px-2.5 py-1">
                  {Number(maxPriceFilter || 0).toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            {availableSizes.length > 0 && (
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Kích cỡ</h3>
                <div className="grid grid-cols-4 gap-2">
                  {availableSizes.slice(0, 8).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize((prev) => (prev === size ? "" : size))}
                      className={`h-8 rounded-md border text-xs font-semibold transition ${
                        selectedSize === size
                          ? "border-[#8ca587] bg-[#8ca587] text-white"
                          : "border-neutral-300 bg-white text-neutral-700 hover:border-[#8ca587]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableColors.length > 0 && (
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Màu sắc</h3>
                <div className="space-y-3">
                  {availableColors.slice(0, 6).map((color) => (
                    <label key={color} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="color"
                        checked={selectedColor === color}
                        onChange={() => setSelectedColor((prev) => (prev === color ? "" : color))}
                        className="h-4 w-4 appearance-none rounded-full border-2 border-neutral-300 checked:border-[#8ca587] checked:bg-[#8ca587] transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-1 after:top-0.5 after:w-1 after:h-2 after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
                      />
                      {color}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Đánh giá</h3>
              <div className="space-y-3">
                {[
                  { id: "3", label: "Từ 3 sao" },
                  { id: "5", label: "5 sao" },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="rating"
                      checked={rating === item.id}
                      onChange={() => setRating((prev) => (prev === item.id ? "" : item.id))}
                      className="h-4 w-4 appearance-none rounded-full border-2 border-neutral-300 checked:border-[#8ca587] checked:bg-[#8ca587] transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-1 after:top-0.5 after:w-1 after:h-2 after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={clearAllFilter}
              className="w-full rounded-md border border-neutral-400 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-white"
            >
              Xóa tất cả
            </button>
          </aside>

          <section className="flex-1 min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Hiển thị {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredProducts.length)} trong {filteredProducts.length} sản phẩm
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Sắp xếp theo</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#8ca587]"
                >
                  <option value="">Mặc định</option>
                  <option value="new">Mới nhất</option>
                  <option value="priceAsc">Giá tăng dần</option>
                  <option value="priceDesc">Giá giảm dần</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-lg bg-white">
                    <div className="aspect-[4/5] animate-pulse bg-neutral-200" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 rounded bg-neutral-200" />
                      <div className="h-3 w-2/3 rounded bg-neutral-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : showProducts.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center text-neutral-600">
                Không tìm thấy sản phẩm phù hợp bộ lọc.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {showProducts.map((item) => {
                    const image = getImageUrl(item?.image || item?.srcImages?.[0]);
                    const priceInfo = getProductPriceInfo(item);
                    const categoryText = item?.categoryId?.name || item?.category || "Sneakers";
                    const resolvedRating = getResolvedProductRating(item, productRatingMap);
                    const roundedRating = Math.round(Math.min(5, Math.max(0, resolvedRating)));
                    const outOfStock = isProductOutOfStock(item);
                    const isRealSale = isProductOnRealSale(item);
                    return (
                      <Link key={item?._id} to={`/product/${item?._id}`} className="group block overflow-hidden rounded-lg bg-white">
                        <div className="relative aspect-[4/4.4] overflow-hidden bg-neutral-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!user?.login || !user?.token) {
                                notify.warning("Vui lòng đăng nhập để thêm sản phẩm vào yêu thích.");
                                navigate("/login", {
                                  state: { from: location.pathname + location.search },
                                });
                                return;
                              }
                              dispatch(toggleWishlist(item));
                            }}
                            className="absolute right-2 top-2 z-20 rounded-full bg-white/90 p-2 shadow ring-1 ring-neutral-200 transition hover:scale-105"
                            aria-label={wishlistIds.has(String(item?._id)) ? "Bỏ yêu thích" : "Yêu thích"}
                          >
                            {wishlistIds.has(String(item?._id)) ? (
                              <FaHeart className="text-red-500" size={14} />
                            ) : (
                              <FaRegHeart className="text-neutral-400" size={14} />
                            )}
                          </button>
                          {isRealSale && (
                            <span className="absolute left-2 top-2 z-20 rounded bg-[#D0021B] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                              {Number(priceInfo?.discountPercent || 0) > 0
                                ? `-${Number(priceInfo.discountPercent)}%`
                                : "Sale"}
                            </span>
                          )}
                          {image ? (
                            <>
                              <img
                                src={image}
                                alt={item?.name || "Sản phẩm"}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              {!outOfStock && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md">
                                    <FaEye size={16} />
                                  </span>
                                </div>
                              )}
                              {outOfStock && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                                  <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-black/65 px-3 text-center text-lg font-semibold text-white shadow-lg">
                                    Hết hàng
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="h-full w-full bg-neutral-200" />
                          )}
                        </div>
                        <div className="p-2.5">
                          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">{item?.name}</h3>
                          <p className="mt-0.5 line-clamp-1 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                            {categoryText}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FaStar
                                key={star}
                                className={`text-[11px] ${star <= roundedRating ? "text-amber-400" : "text-neutral-300"}`}
                              />
                            ))}
                            <span className="ml-1 text-[11px] text-neutral-500">
                              ({resolvedRating > 0 ? resolvedRating.toFixed(1) : "0.0"})
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-neutral-900">
                              {Number(priceInfo?.effectivePrice || 0).toLocaleString("vi-VN")}đ
                            </span>
                            {priceInfo?.hasSale && (
                              <span className="text-xs text-neutral-400 line-through">
                                {Number(priceInfo?.originalPrice || 0).toLocaleString("vi-VN")}đ
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {totalPage > 1 && (
                  <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Phân trang">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      className="h-8 w-8 rounded border border-neutral-300 bg-white text-neutral-700 disabled:opacity-40"
                      aria-label="Trang trước"
                    >
                      <FaChevronLeft className="mx-auto text-xs" />
                    </button>
                    {pageItems.map((item, idx) =>
                      item === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-sm text-neutral-500">
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          className={`h-8 min-w-8 rounded px-2 text-sm font-medium ${
                            page === item
                              ? "bg-[#8ca587] text-white"
                              : "border border-neutral-300 bg-white text-neutral-700"
                          }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      disabled={page >= totalPage}
                      onClick={() => setPage((prev) => Math.min(totalPage, prev + 1))}
                      className="h-8 w-8 rounded border border-neutral-300 bg-white text-neutral-700 disabled:opacity-40"
                      aria-label="Trang sau"
                    >
                      <FaChevronRight className="mx-auto text-xs" />
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};

export default ProductPage;