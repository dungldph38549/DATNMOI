import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaHeart, FaRegHeart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, getAllCategories } from "../../api";
import { getProductPriceInfo, getProductPriceRange } from "../../utils/pricing.js";
import { isProductOutOfStock } from "../../utils/stock.js";
import {
  getVariantLaceColorValue,
  getVariantShoelaceLengthValue,
  getVariantAccessorySizeValue,
  getVariantSoleValue,
  inferAccessorySubKindFromProduct,
} from "../../utils/variantAttributes";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";
import ProductCardRating from "../../components/ProductCardRating/ProductCardRating";

const PAGE_STEP = 12;

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

const isProductOnRealSale = (p) => {
  if (!p) return false;
  const amt = (v) => Number(v) || 0;
  if (amt(p.saleDiscountAmount) > 0) return true;
  if (Array.isArray(p.variants) && p.variants.some((v) => amt(v?.saleDiscountAmount) > 0)) {
    return true;
  }
  return false;
};

const getDiscountPercent = (p) => {
  const info = getProductPriceInfo(p);
  if (info.discountPercent > 0) return info.discountPercent;
  const original = Number(p?.originalPriceRange?.min ?? p?.originalPrice ?? p?.price ?? 0);
  const effective = Number(p?.priceRange?.min ?? p?.effectivePrice ?? p?.salePrice ?? p?.price ?? 0);
  if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(effective)) return 0;
  return Math.max(0, Math.round(((original - effective) / original) * 100));
};

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

/** Khớp độ dài dây khi dữ liệu lệch định dạng (120 / 120cm / 120 CM). */
const lengthLabelMatchesFilter = (len, filter) => {
  const a = normalizeValue(len).replace(/\s+/g, "").replace(",", ".");
  const b = normalizeValue(filter).replace(/\s+/g, "").replace(",", ".");
  if (!b) return true;
  if (a === b) return true;
  const num = (s) => {
    const m = s.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : NaN;
  };
  const na = num(a);
  const nb = num(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true;
  return false;
};

/** Khớp màu khi UI có "Màu Đen" còn biến thể chỉ "Đen" hoặc ngược lại. */
const colorLabelMatchesFilter = (label, filter) => {
  const strip = (s) => normalizeValue(s).replace(/^(màu|mau)\s+/, "").trim();
  const a = strip(label);
  const b = strip(filter);
  if (!b) return true;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
};

const getProductLaceColors = (product) => {
  const colors = [];
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant) => {
      const fromAttrs = getVariantLaceColorValue(variant);
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

const getProductShoelaceLengths = (product) => {
  const lengths = [];
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant) => {
      const v = getVariantShoelaceLengthValue(variant, product);
      if (v != null && String(v).trim() !== "") lengths.push(String(v).trim());
    });
  }
  return [...new Set(lengths)];
};

const getProductSoleValues = (product) => {
  const vals = [];
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant) => {
      const v = getVariantSoleValue(variant);
      if (v != null && String(v).trim() !== "") vals.push(String(v).trim());
    });
  }
  return [...new Set(vals)];
};

/** Cỡ lót — chỉ SP nhận diện là lót; không gộp độ dài dây (đã tách ở variantAttributes). */
const getProductInsoleSizes = (product) => {
  if (inferAccessorySubKindFromProduct(product) !== "insole") return [];
  const vals = [];
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant) => {
      const v = getVariantAccessorySizeValue(variant);
      if (v != null && String(v).trim() !== "") vals.push(String(v).trim());
    });
  }
  return [...new Set(vals)];
};

/** Sort length labels: numeric first (120, 120cm), then locale. */
const sortLengthLabels = (a, b) => {
  const num = (s) => {
    const m = String(s).match(/(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(",", ".")) : NaN;
  };
  const na = num(a);
  const nb = num(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  if (!Number.isNaN(na) && Number.isNaN(nb)) return -1;
  if (Number.isNaN(na) && !Number.isNaN(nb)) return 1;
  return a.localeCompare(b, "vi");
};

/** Gợi ý màu nền cho swatch (tên tiếng Việt / Anh) */
const colorToHex = (name) => {
  const n = normalizeValue(name);
  if (!n) return "#e5e5e5";
  if (n.includes("trắng") || n.includes("white")) return "#f5f5f5";
  if (n.includes("đen") || n.includes("black")) return "#171717";
  if (n.includes("xám") || n.includes("grey") || n.includes("gray")) return "#a3a3a3";
  if (n.includes("đỏ") || n.includes("red")) return "#b91c1c";
  if (n.includes("xanh") && n.includes("lá")) return "#166534";
  if (n.includes("xanh") || n.includes("blue")) return "#1d4ed8";
  if (n.includes("vàng") || n.includes("yellow")) return "#ca8a04";
  if (n.includes("hồng") || n.includes("pink")) return "#db2777";
  if (n.includes("nâu") || n.includes("brown")) return "#78350f";
  if (n.includes("be") || n.includes("kem") || n.includes("cream")) return "#e7e5e4";
  let h = 0;
  for (let i = 0; i < n.length; i += 1) h = (h * 31 + n.charCodeAt(i)) % 360;
  return `hsl(${h} 35% 45%)`;
};

const FILTER_LABELS = {
  typeSection: "Lo\u1ea1i ph\u1ee5 ki\u1ec7n",
  allTypes: "T\u1ea5t c\u1ea3 lo\u1ea1i",
  lengthSection: "\u0110\u1ed9 d\u00e0i d\u00e2y",
  allLengths: "T\u1ea5t c\u1ea3 \u0111\u1ed9 d\u00e0i",
  soleSection: "\u0110\u1ebf gi\u00e0y",
  allSoles: "T\u1ea5t c\u1ea3 \u0111\u1ebf gi\u00e0y",
  sizeSection: "Size l\u00f3t gi\u00e0y",
  allSizes: "T\u1ea5t c\u1ea3 size",
  laceColor: "M\u00e0u d\u00e2y",
  genericColor: "M\u00e0u s\u1eafc",
};

const TYPE_FILTER_CHOICES = [
  { id: "shoelace", label: "D\u00e2y gi\u00e0y" },
  { id: "insole", label: "L\u00f3t gi\u00e0y" },
  { id: "other", label: "Kh\u00e1c (balo, ph\u1ee5 ki\u1ec7n\u2026)" },
];

const filterHeadingClass = "mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500";

const filterRadioRowClass =
  "flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm text-neutral-700 outline-none transition hover:bg-neutral-100/80 focus-visible:ring-2 focus-visible:ring-[#8ca587]/40";

const AccessoryRadioDot = ({ on }) => (
  <span
    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
      on ? "border-[#8ca587] bg-[#8ca587]" : "border-neutral-300 bg-white"
    }`}
    aria-hidden
  >
    {on ? <span className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" /> : null}
  </span>
);

/** Nút role=radio: bấm chọn / bấm lại cùng mục = bỏ chọn — không dùng <input type="radio"> để tránh lệch UI trình duyệt. */
const VerticalOptionFilter = ({ title, allLabel, options, value, onChange, radioName }) => {
  if (!options.length) return null;
  const gid = radioName || "accessory-option";
  const titleId = `${gid}-legend`;
  return (
    <div>
      <h3 id={titleId} className={filterHeadingClass}>
        {title}
      </h3>
      <div role="radiogroup" aria-labelledby={titleId} className="space-y-1">
        <button
          type="button"
          role="radio"
          aria-checked={value === ""}
          className={filterRadioRowClass}
          onClick={() => onChange("")}
        >
          <AccessoryRadioDot on={value === ""} />
          {allLabel}
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            className={filterRadioRowClass}
            onClick={() => onChange(value === opt ? "" : opt)}
          >
            <AccessoryRadioDot on={value === opt} />
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

const AccessoriesPage = () => {
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  /** "" | "shoelace" | "insole" | "other" — lọc theo tên SP + danh mục, không theo categoryId trùng lặp */
  const [typeFilter, setTypeFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [lengthFilter, setLengthFilter] = useState("");
  const [soleFilter, setSoleFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [sort, setSort] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const catRes = await getAllCategories("active");
        const categories = Array.isArray(catRes?.data) ? catRes.data : [];
        const accessoryCat = categories.find((c) => isAccessoryCategory(c));
        if (!accessoryCat?._id) {
          setProducts([]);
          return;
        }
        let res = await fetchProducts({
          limit: 400,
          page: 0,
          categoryId: accessoryCat._id,
        });
        let list = res?.data ?? res ?? [];
        if (!Array.isArray(list) || list.length === 0) {
          res = await fetchProducts({ limit: 400, page: 0 });
          const raw = res?.data ?? res ?? [];
          const aid = String(accessoryCat._id);
          list = Array.isArray(raw)
            ? raw.filter((p) => String(p?.categoryId?._id ?? p?.categoryId ?? "") === aid)
            : [];
        }
        setProducts(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedAccessoryKind = useMemo(() => {
    if (typeFilter === "shoelace") return "shoelace";
    if (typeFilter === "insole") return "insole";
    if (typeFilter === "other") return "other";
    return "all";
  }, [typeFilter]);

  const productsForFilterOptions = useMemo(() => {
    if (!typeFilter) return products;
    return products.filter((p) => inferAccessorySubKindFromProduct(p) === typeFilter);
  }, [products, typeFilter]);

  useEffect(() => {
    if (selectedAccessoryKind === "insole") setLengthFilter("");
    if (selectedAccessoryKind === "shoelace") setSizeFilter("");
  }, [selectedAccessoryKind]);

  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [typeFilter, colorFilter, lengthFilter, soleFilter, sizeFilter, sort]);

  const colorOptions = useMemo(() => {
    const set = new Set();
    productsForFilterOptions.forEach((p) => getProductLaceColors(p).forEach((c) => set.add(c)));
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [productsForFilterOptions]);

  const lengthOptions = useMemo(() => {
    const set = new Set();
    productsForFilterOptions.forEach((p) => getProductShoelaceLengths(p).forEach((len) => set.add(len)));
    return [...set].sort(sortLengthLabels);
  }, [productsForFilterOptions]);

  const soleOptions = useMemo(() => {
    const set = new Set();
    productsForFilterOptions.forEach((p) => getProductSoleValues(p).forEach((v) => set.add(v)));
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [productsForFilterOptions]);

  const sizeOptions = useMemo(() => {
    const set = new Set();
    productsForFilterOptions.forEach((p) => getProductInsoleSizes(p).forEach((v) => set.add(v)));
    return [...set].sort(sortLengthLabels);
  }, [productsForFilterOptions]);

  const showLengthFilter =
    (selectedAccessoryKind === "all" || selectedAccessoryKind === "other" || selectedAccessoryKind === "shoelace") &&
    lengthOptions.length > 0;
  const showSizeFilter =
    (selectedAccessoryKind === "all" || selectedAccessoryKind === "other" || selectedAccessoryKind === "insole") &&
    sizeOptions.length > 0;
  const showSoleFilter =
    (selectedAccessoryKind === "all" || selectedAccessoryKind === "other" || selectedAccessoryKind === "insole") &&
    soleOptions.length > 0;

  const colorSectionTitle =
    selectedAccessoryKind === "shoelace" ? FILTER_LABELS.laceColor : FILTER_LABELS.genericColor;

  const filteredProducts = useMemo(() => {
    let data = [...products];

    if (typeFilter) {
      data = data.filter((p) => inferAccessorySubKindFromProduct(p) === typeFilter);
    }

    if (colorFilter) {
      data = data.filter((p) =>
        getProductLaceColors(p).some((c) => colorLabelMatchesFilter(c, colorFilter)),
      );
    }

    if (lengthFilter && showLengthFilter) {
      data = data.filter((p) =>
        getProductShoelaceLengths(p).some((len) => lengthLabelMatchesFilter(len, lengthFilter)),
      );
    }

    if (soleFilter && showSoleFilter) {
      data = data.filter((p) =>
        getProductSoleValues(p).some((v) => normalizeValue(v) === normalizeValue(soleFilter)),
      );
    }

    if (sizeFilter && showSizeFilter) {
      data = data.filter((p) =>
        getProductInsoleSizes(p).some((v) => normalizeValue(v) === normalizeValue(sizeFilter)),
      );
    }

    if (sort === "priceAsc") data.sort((a, b) => getProductMinPrice(a) - getProductMinPrice(b));
    else if (sort === "priceDesc") data.sort((a, b) => getProductMinPrice(b) - getProductMinPrice(a));
    else if (sort === "new") data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return data;
  }, [
    products,
    typeFilter,
    colorFilter,
    lengthFilter,
    soleFilter,
    sizeFilter,
    showLengthFilter,
    showSoleFilter,
    showSizeFilter,
    sort,
  ]);

  const visibleList = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  const getImageUrl = (img) => {
    if (!img || typeof img !== "string") return "";
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    if (img.startsWith("/uploads/")) return `http://localhost:3002${img}`;
    if (img.startsWith("uploads/")) return `http://localhost:3002/${img}`;
    return `http://localhost:3002/uploads/${img}`;
  };

  const clearFilters = () => {
    setSort("");
    setTypeFilter("");
    setColorFilter("");
    setLengthFilter("");
    setSoleFilter("");
    setSizeFilter("");
  };

  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((w) => String(w?._id))),
    [wishlistItems],
  );

  return (
    <main className="min-h-screen bg-[#f5f5f4] pt-12 pb-10 text-neutral-900">
      <section className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <aside className="w-full lg:w-[248px] lg:shrink-0 space-y-6">
            <div>
              <h3 id="accessory-type-legend" className={filterHeadingClass}>
                {FILTER_LABELS.typeSection}
              </h3>
              <div role="radiogroup" aria-labelledby="accessory-type-legend" className="space-y-1">
                <button
                  type="button"
                  role="radio"
                  aria-checked={typeFilter === ""}
                  className={filterRadioRowClass}
                  onClick={() => {
                    setTypeFilter("");
                    setColorFilter("");
                  }}
                >
                  <AccessoryRadioDot on={typeFilter === ""} />
                  {FILTER_LABELS.allTypes}
                </button>
                {TYPE_FILTER_CHOICES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={typeFilter === opt.id}
                    className={filterRadioRowClass}
                    onClick={() => {
                      if (typeFilter === opt.id) {
                        setTypeFilter("");
                        setColorFilter("");
                      } else {
                        setTypeFilter(opt.id);
                      }
                    }}
                  >
                    <AccessoryRadioDot on={typeFilter === opt.id} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {showLengthFilter && (
              <VerticalOptionFilter
                title={FILTER_LABELS.lengthSection}
                allLabel={FILTER_LABELS.allLengths}
                options={lengthOptions}
                value={lengthFilter}
                onChange={setLengthFilter}
                radioName="accessory-length"
              />
            )}

            {showSoleFilter && (
              <VerticalOptionFilter
                title={FILTER_LABELS.soleSection}
                allLabel={FILTER_LABELS.allSoles}
                options={soleOptions}
                value={soleFilter}
                onChange={setSoleFilter}
                radioName="accessory-sole"
              />
            )}

            {showSizeFilter && (
              <VerticalOptionFilter
                title={FILTER_LABELS.sizeSection}
                allLabel={FILTER_LABELS.allSizes}
                options={sizeOptions}
                value={sizeFilter}
                onChange={setSizeFilter}
                radioName="accessory-size"
              />
            )}

            {colorOptions.length > 0 && (
              <div>
                <h3 id="accessory-color-legend" className={filterHeadingClass}>
                  {colorSectionTitle}
                </h3>
                <div role="radiogroup" aria-labelledby="accessory-color-legend" className="space-y-1">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={colorFilter === ""}
                    className={filterRadioRowClass}
                    onClick={() => setColorFilter("")}
                  >
                    <AccessoryRadioDot on={colorFilter === ""} />
                    Tất cả màu
                  </button>
                  {colorOptions.slice(0, 24).map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={colorFilter === c}
                      className={filterRadioRowClass}
                      onClick={() => setColorFilter(colorFilter === c ? "" : c)}
                    >
                      <AccessoryRadioDot on={colorFilter === c} />
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-neutral-200"
                          style={{ backgroundColor: colorToHex(c) }}
                          aria-hidden
                        />
                        {c}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-md border border-neutral-400 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-white"
            >
              Xóa tất cả
            </button>
          </aside>

          <section className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Hiển thị 1 - {Math.min(visibleCount, filteredProducts.length)} trong {filteredProducts.length} phụ kiện
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
            ) : visibleList.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center text-neutral-600">
                Không tìm thấy phụ kiện phù hợp bộ lọc.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {visibleList.map((item) => {
                    const image = getImageUrl(item?.image || item?.srcImages?.[0]);
                    const { minPrice, maxPrice } = getProductPriceRange(item);
                    const categoryText = item?.categoryId?.name || item?.category || "Phụ kiện";
                    const outOfStock = isProductOutOfStock(item);
                    const onSale = isProductOnRealSale(item);
                    const discountPct = onSale ? getDiscountPercent(item) : 0;
                    return (
                      <Link
                        key={item._id}
                        to={`/product/${item._id}`}
                        className="group block overflow-hidden rounded-lg bg-white"
                      >
                        <div className="relative aspect-[4/4.4] overflow-hidden bg-neutral-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
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
                          {image ? (
                            <>
                              <img
                                src={image}
                                alt={item.name}
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
                                    Bán hết
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="h-full w-full bg-neutral-200" />
                          )}
                          {onSale && (
                            <span className="pointer-events-none absolute left-2 top-2 z-10 bg-[#D0021B] px-2 py-1 text-[10px] font-bold tabular-nums tracking-wider text-white">
                              {discountPct > 0 ? `-${discountPct}%` : "SALE"}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5">
                          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">{item.name}</h3>
                          <p className="mt-0.5 line-clamp-1 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                            {categoryText}
                          </p>
                          <ProductCardRating product={item} className="mt-1" />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`text-base font-bold tabular-nums ${outOfStock ? "text-neutral-500" : "text-[#D0021B]"}`}
                            >
                              {outOfStock
                                ? "Bán hết"
                                : minPrice === maxPrice
                                  ? `${Number(minPrice || 0).toLocaleString("vi-VN")}đ`
                                  : `${Number(minPrice || 0).toLocaleString("vi-VN")} - ${Number(maxPrice || 0).toLocaleString("vi-VN")}đ`}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {visibleCount < filteredProducts.length && (
                  <div className="mt-12 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((n) => n + PAGE_STEP)}
                      className="rounded-full bg-black px-10 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Xem thêm sản phẩm
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};

export default AccessoriesPage;
