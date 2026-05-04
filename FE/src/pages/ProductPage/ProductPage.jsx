import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaHeart, FaRegHeart, FaEye } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, getAllCategories, getVoucherByCode } from "../../api";
import { getProductPriceInfo, getProductPriceRange } from "../../utils/pricing.js";
import { getVariantColorValue, getVariantSizeValue } from "../../utils/variantAttributes";
import { isProductOutOfStock } from "../../utils/stock.js";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";
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

const categoryFilterRowClass =
  "flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm text-neutral-700 outline-none transition hover:bg-neutral-100/80 focus-visible:ring-2 focus-visible:ring-[#8ca587]/40";

const CategoryRadioDot = ({ on }) => (
  <span
    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
      on ? "border-[#8ca587] bg-[#8ca587]" : "border-neutral-300 bg-white"
    }`}
    aria-hidden
  >
    {on ? <span className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" /> : null}
  </span>
);

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

/** Cùng chuẩn trang /sale — chỉ badge khi có giảm giá thật (saleRules / saleDiscountAmount). */
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

const ProductPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const [products, setProducts] = useState([]);
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
            setLoading(false);
            return;
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
  }, [categorySlug, segment, location.search]);

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
      data = data.filter((p) => Number(p?.rating ?? 0) >= Number(rating));
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
    sort,
  ]);

  useEffect(() => {
    setPage(1);
  }, [sort, categoryFilter, selectedSize, selectedColor, rating]);

  const totalPage = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const showProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAllFilter = () => {
    setSort("");
    setCategoryFilter("");
    setSelectedSize("");
    setSelectedColor("");
    setRating("");
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
      <section className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <aside className="w-full lg:w-[248px] lg:shrink-0 space-y-6">
            {!categorySlug && sidebarCategories.length > 0 && (
              <div>
                <h3 id="product-category-legend" className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Loại sản phẩm
                </h3>
                <div role="radiogroup" aria-labelledby="product-category-legend" className="space-y-1">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={categoryFilter === ""}
                    className={categoryFilterRowClass}
                    onClick={() => {
                      setCategoryFilter("");
                      setSelectedColor("");
                    }}
                  >
                    <CategoryRadioDot on={categoryFilter === ""} />
                    Tất cả sản phẩm
                  </button>
                  {sidebarCategories.map((c) => {
                    const value = String(c?._id || "");
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={categoryFilter === value}
                        className={categoryFilterRowClass}
                        onClick={() => {
                          if (categoryFilter === value) {
                            setCategoryFilter("");
                            setSelectedColor("");
                          } else {
                            setCategoryFilter(value);
                          }
                        }}
                      >
                        <CategoryRadioDot on={categoryFilter === value} />
                        {c?.name || "Danh mục"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {availableSizes.length > 0 && (
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Kích cỡ</h3>
                <div className="grid grid-cols-4 gap-2">
                  {availableSizes.slice(0, 8).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        if (selectedSize === size) {
                          setSelectedSize("");
                          setSelectedColor("");
                        } else {
                          setSelectedSize(size);
                        }
                      }}
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
                  { id: "4", label: "Từ 4 sao" },
                  { id: "5", label: "Từ 5 sao" },
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
                    const { minPrice, maxPrice } = getProductPriceRange(item);
                    const categoryText = item?.categoryId?.name || item?.category || "Sneakers";
                    const outOfStock = isProductOutOfStock(item);
                    const onSale = isProductOnRealSale(item);
                    const discountPct = onSale ? getDiscountPercent(item) : 0;
                    return (
                      <Link key={item?._id} to={`/product/${item?._id}`} className="group block overflow-hidden rounded-lg bg-white">
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
                          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">{item?.name}</h3>
                          <p className="mt-0.5 line-clamp-1 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                            {categoryText}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-neutral-900">
                              {minPrice === maxPrice
                                ? `${Number(minPrice || 0).toLocaleString("vi-VN")}đ`
                                : `${Number(minPrice || 0).toLocaleString("vi-VN")} - ${Number(maxPrice || 0).toLocaleString("vi-VN")}đ`}
                            </span>
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