import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "../../api";
import { getProductPriceInfo } from "../../utils/pricing.js";
import { getVariantColorValue } from "../../utils/variantAttributes";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";

const PAGE_STEP = 12;

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

/** Chỉ sale thật từ saleRules (bỏ qua giá niêm yết ảo +% trên FE/BE). */
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

const getSubLabel = (p) => {
  const cat = (p?.categoryId?.name || p?.category || "").trim();
  const color = getProductColors(p)[0];
  if (cat && color) return `${cat} / ${color}`.toUpperCase();
  if (cat) return cat.toUpperCase();
  const short = (p?.shortDescription || "").trim();
  if (short) return short.slice(0, 48).toUpperCase();
  return "SNEAKER CONVERSE";
};

const SalePage = () => {
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts({ limit: 400, page: 0 });
        const all = res?.data ?? res ?? [];
        setProducts(Array.isArray(all) ? all : []);
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saleProducts = useMemo(
    () => (products || []).filter((p) => isProductOnRealSale(p)),
    [products],
  );

  const sortedSale = useMemo(() => {
    return [...saleProducts].sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
  }, [saleProducts]);

  const maxDiscountShown = useMemo(() => {
    if (!saleProducts.length) return 60;
    const m = Math.max(...saleProducts.map((p) => getDiscountPercent(p)));
    return Math.min(60, Math.max(m, 15));
  }, [saleProducts]);

  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [saleProducts.length]);

  const visibleList = useMemo(
    () => sortedSale.slice(0, visibleCount),
    [sortedSale, visibleCount],
  );

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
    <main className="min-h-screen bg-white pb-16 pt-12 font-body text-neutral-900">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Hero — Seasonal clearance */}
        <section className="mb-12 md:mb-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                Seasonal clearance
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold leading-[1.15] tracking-tight text-black md:text-5xl lg:text-[2.75rem]">
                DEAL HOT GIÁ SỐC.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
                Những mẫu được tuyển chọn từ kho lưu trữ — giày và phụ kiện tinh chỉnh, giá ưu đãi trong thời gian có hạn.
              </p>
            </div>
            <div className="shrink-0 lg:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Ưu đãi tối đa</p>
              <p className="mt-1 font-display text-5xl font-bold tabular-nums text-black md:text-6xl">
                {maxDiscountShown}%
              </p>
            </div>
          </div>
        </section>

        {/* Product grid — không bộ lọc */}
        <section className="pb-16">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/5] animate-pulse rounded-lg bg-neutral-100" />
                  <div className="mt-4 flex justify-between gap-4">
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleList.length === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-500">
              Hiện chưa có sản phẩm sale. Vui lòng quay lại sau.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {visibleList.map((item) => {
                  const image = getImageUrl(item?.image || item?.srcImages?.[0]);
                  const priceInfo = getProductPriceInfo(item);
                  const eff = Number(priceInfo.effectivePrice ?? 0) || getProductMinPrice(item);
                  const orig = Number(priceInfo.originalPrice ?? 0);
                  return (
                    <Link key={item._id} to={`/product/${item._id}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100">
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
                          <img
                            src={image}
                            alt={item.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="h-full w-full bg-neutral-200" />
                        )}
                        <span className="absolute left-2 top-2 bg-[#D0021B] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          Sale
                        </span>
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-sm font-bold leading-snug text-black md:text-base">
                            {item.name}
                          </h2>
                          <p className="mt-1 line-clamp-2 text-[11px] uppercase leading-relaxed tracking-[0.06em] text-neutral-500">
                            {getSubLabel(item)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-[#D0021B] md:text-base">
                            {eff.toLocaleString("vi-VN")}đ
                          </p>
                          {priceInfo.hasSale && orig > eff && (
                            <p className="mt-0.5 text-xs tabular-nums text-neutral-400 line-through">
                              {orig.toLocaleString("vi-VN")}đ
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {visibleCount < sortedSale.length && (
                <div className="mt-14 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_STEP)}
                    className="rounded-full border border-neutral-900 bg-black px-10 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-900"
                  >
                    Xem thêm sản phẩm
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default SalePage;