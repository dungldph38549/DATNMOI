import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, getAllCategories } from "../../api";
import { getProductPriceInfo } from "../../utils/pricing";
import { getVariantColorValue } from "../../utils/variantAttributes";
import { toggleWishlist } from "../../redux/wishlist/wishlistSlice";

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

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

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

const PRICE_OPTIONS = [
  { id: "", label: "Tất cả mức giá" },
  { id: "under200", label: "Dưới 200.000đ" },
  { id: "200-500", label: "200.000đ – 500.000đ" },
  { id: "500-1000", label: "500.000đ – 1.000.000đ" },
  { id: "over1000", label: "Trên 1.000.000đ" },
];

const AccessoriesPage = () => {
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [priceBracket, setPriceBracket] = useState("");
  const [colorFilter, setColorFilter] = useState("");
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

  const categoryOptions = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const id = String(p?.categoryId?._id ?? p?.categoryId ?? "");
      const name = p?.categoryId?.name || p?.category || "";
      if (id && name && !map.has(id)) map.set(id, name);
    });
    return [{ id: "", label: "TẤT CẢ PHỤ KIỆN" }, ...[...map.entries()].map(([id, label]) => ({ id, label: String(label).toUpperCase() }))];
  }, [products]);

  const colorOptions = useMemo(() => {
    const set = new Set();
    products.forEach((p) => getProductColors(p).forEach((c) => set.add(c)));
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let data = [...products];

    if (categoryFilterId) {
      data = data.filter(
        (p) => String(p?.categoryId?._id ?? p?.categoryId ?? "") === categoryFilterId,
      );
    }

    if (priceBracket === "under200") {
      data = data.filter((p) => getProductMinPrice(p) < 200_000);
    } else if (priceBracket === "200-500") {
      data = data.filter((p) => {
        const x = getProductMinPrice(p);
        return x >= 200_000 && x <= 500_000;
      });
    } else if (priceBracket === "500-1000") {
      data = data.filter((p) => {
        const x = getProductMinPrice(p);
        return x >= 500_000 && x <= 1_000_000;
      });
    } else if (priceBracket === "over1000") {
      data = data.filter((p) => getProductMinPrice(p) > 1_000_000);
    }

    if (colorFilter) {
      data = data.filter((p) =>
        getProductColors(p).some((c) => normalizeValue(c) === normalizeValue(colorFilter)),
      );
    }

    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return data;
  }, [products, categoryFilterId, priceBracket, colorFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [categoryFilterId, priceBracket, colorFilter]);

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
    setCategoryFilterId("");
    setPriceBracket("");
    setColorFilter("");
  };

  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((w) => String(w?._id))),
    [wishlistItems],
  );

  return (
    <main className="min-h-screen bg-white pt-12 pb-16 text-neutral-900">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-3 border-b border-neutral-200 pb-2">
          <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-black md:text-5xl lg:text-[2.75rem]">
            PHỤ KIỆN
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-600 md:text-sm">
            Hoàn thiện phong cách của bạn với tất cả mọi thứ ngoài đôi giày — từ vớ, mũ đến dụng cụ chăm sóc.
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
          <aside className="w-full shrink-0 lg:w-[240px]">
            <div className="space-y-10">
              <div>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Danh mục
                </h2>
                <nav className="flex flex-col gap-3">
                  {categoryOptions.map((opt) => {
                    const active = categoryFilterId === opt.id;
                    return (
                      <button
                        key={opt.id || "all"}
                        type="button"
                        onClick={() => setCategoryFilterId(opt.id)}
                        className={`text-left text-sm transition-colors ${
                          active ? "font-semibold text-black underline underline-offset-4" : "text-neutral-600 hover:text-black"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Khoảng giá
                </h2>
                <div className="flex flex-col gap-3">
                  {PRICE_OPTIONS.map((opt) => (
                    <label
                      key={opt.id || "all-price"}
                      className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700"
                    >
                      <input
                        type="radio"
                        name="priceBracket"
                        checked={priceBracket === opt.id}
                        onChange={() => setPriceBracket(opt.id)}
                        className="h-4 w-4 border-neutral-300 text-black accent-black"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {colorOptions.length > 0 && (
                <div>
                  <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    Màu sắc
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {colorOptions.slice(0, 12).map((c) => {
                      const active = colorFilter === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          onClick={() => setColorFilter((prev) => (prev === c ? "" : c))}
                          className={`h-9 w-9 rounded-full border-2 transition-shadow ${
                            active ? "border-black shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" : "border-neutral-200 hover:border-neutral-400"
                          }`}
                          style={{ backgroundColor: colorToHex(c) }}
                          aria-label={c}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-neutral-500 underline-offset-4 hover:text-black hover:underline"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl bg-neutral-50">
                    <div className="aspect-square animate-pulse bg-neutral-200" />
                    <div className="space-y-2 p-3">
                      <div className="h-2 w-1/3 animate-pulse rounded bg-neutral-200" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-200" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleList.length === 0 ? (
              <p className="py-16 text-center text-sm text-neutral-500">
                Chưa có phụ kiện phù hợp bộ lọc.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
                  {visibleList.map((item) => {
                    const image = getImageUrl(item?.image || item?.srcImages?.[0]);
                    const priceInfo = getProductPriceInfo(item);
                    const catLabel = (item?.categoryId?.name || item?.category || "Phụ kiện").toUpperCase();
                    return (
                      <Link
                        key={item._id}
                        to={`/product/${item._id}`}
                        className="group block overflow-hidden rounded-xl bg-white"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
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
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="h-full w-full bg-neutral-200" />
                          )}
                        </div>
                        <div className="pt-3">
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                            {catLabel}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-black">{item.name}</h3>
                          <p className="mt-2 text-sm text-neutral-800">
                            {Number(priceInfo?.effectivePrice ?? 0).toLocaleString("vi-VN")}đ
                          </p>
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
      </div>
    </main>
  );
};

export default AccessoriesPage;
