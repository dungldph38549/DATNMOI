import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Product from "../../components/Product/Product";
import { fetchProducts, getAllCategories, getReviewStatsByProduct, getVoucherByCode } from "../../api";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaFilter,
  FaSortAmountDown,
  FaTimes,
} from "react-icons/fa";

const PAGE_SIZE = 30;

/** Khớp logic slug ở BE (CategoryController) để ?category=phu-kien khớp "Phụ kiện" */
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

const ProductPage = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voucherScope, setVoucherScope] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [reviewStatsByProductId, setReviewStatsByProductId] = useState({});

  const [sort, setSort] = useState("");
  const [price, setPrice] = useState("");
  const [rating, setRating] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sidebarCategories, setSidebarCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [categoryLabel, setCategoryLabel] = useState(null);

  const categorySlug = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("category");
    return raw ? raw.trim().toLowerCase() : "";
  }, [location.search]);
  const segment = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("segment");
    return raw ? raw.trim().toLowerCase() : "";
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const payload = { limit: 200, page: 0 };
        const catRes = await getAllCategories("active");
        const categories = Array.isArray(catRes?.data) ? catRes.data : [];
        const accessoryCategory = categories.find((c) => {
          const slugFromDb = c.slug != null && String(c.slug).trim() !== ""
            ? String(c.slug).trim().toLowerCase()
            : null;
          if (slugFromDb && slugFromDb === "phu-kien") return true;
          return categoryNameToSlug(c.name || "") === "phu-kien";
        });

        if (categorySlug) {
          const match = categories.find((c) => {
            const slugFromDb = c.slug != null && String(c.slug).trim() !== ""
              ? String(c.slug).trim().toLowerCase()
              : null;
            if (slugFromDb && slugFromDb === categorySlug) return true;
            return categoryNameToSlug(c.name || "") === categorySlug;
          });

          if (match?._id) {
            payload.categoryId = match._id;
            setCategoryLabel(match.name || null);
          } else {
            setCategoryLabel(null);
            setProducts([]);
            let forSidebar = Array.isArray(categories) ? [...categories] : [];
            if (segment === "products") {
              forSidebar = forSidebar.filter((c) => !isAccessoryCategory(c));
            }
            setSidebarCategories(
              forSidebar.sort((a, b) =>
                String(a?.name || "").localeCompare(String(b?.name || ""), "vi"),
              ),
            );
            return;
          }
        } else {
          setCategoryLabel(null);
        }

        const res = await fetchProducts(payload);
        let nextProducts = res?.data ?? res ?? [];
        if (!categorySlug && segment === "products" && accessoryCategory?._id) {
          nextProducts = nextProducts.filter(
            (p) => String(p?.categoryId?._id ?? p?.categoryId ?? "") !== String(accessoryCategory._id),
          );
          setCategoryLabel("Sản phẩm");
        }
        let forSidebar = Array.isArray(categories) ? [...categories] : [];
        if (segment === "products") {
          forSidebar = forSidebar.filter((c) => !isAccessoryCategory(c));
        }
        setSidebarCategories(
          forSidebar.sort((a, b) =>
            String(a?.name || "").localeCompare(String(b?.name || ""), "vi"),
          ),
        );
        setProducts(nextProducts);
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [location.search, categorySlug, segment]);

  useEffect(() => {
    const voucherCode = new URLSearchParams(location.search).get("voucher");
    if (!voucherCode) {
      setVoucherScope(null);
      return;
    }
    let cancelled = false;
    const loadVoucher = async () => {
      try {
        setVoucherLoading(true);
        const voucher = await getVoucherByCode(voucherCode);
        if (cancelled) return;
        setVoucherScope(voucher || null);
      } catch {
        if (!cancelled) setVoucherScope(null);
      } finally {
        if (!cancelled) setVoucherLoading(false);
      }
    };
    loadVoucher();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  useEffect(() => {
    const ids = (Array.isArray(products) ? products : [])
      .map((p) => String(p?._id || ""))
      .filter(Boolean);
    if (!ids.length) {
      setReviewStatsByProductId({});
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const statsList = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await getReviewStatsByProduct(id);
              const stats = res?.data ?? res ?? {};
              return [id, stats];
            } catch {
              return [id, { average: 0, total: 0 }];
            }
          }),
        );
        if (cancelled) return;
        setReviewStatsByProductId(Object.fromEntries(statsList));
      } catch {
        if (!cancelled) setReviewStatsByProductId({});
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [products]);

  /** Trùng logic lọc/sắp xếp: ưu tiên điểm TB từ API đánh giá, sau đó `product.rating`. */
  const getProductRating = useCallback(
    (p) => {
      const id = String(p?._id || "");
      const stats = id ? reviewStatsByProductId[id] : null;
      const fromStats = Number(stats?.average);
      if (Number.isFinite(fromStats)) return fromStats;
      const fromProduct = Number(p?.rating);
      if (Number.isFinite(fromProduct)) return fromProduct;
      return 0;
    },
    [reviewStatsByProductId],
  );

  const filteredProducts = useMemo(() => {
    let data = [...products];
    const applicableIds = Array.isArray(voucherScope?.applicableProductIds)
      ? voucherScope.applicableProductIds.map((id) => String(id))
      : [];
    if (applicableIds.length > 0) {
      data = data.filter((p) => applicableIds.includes(String(p?._id)));
    }

    const getMinPrice = (p) => {
      const pr = p?.priceRange;
      if (pr && (pr.min != null || pr.max != null)) return Number(pr.min ?? 0) || 0;
      if (typeof p?.price === "number") return p.price;
      if (Array.isArray(p?.variants) && p.variants.length > 0) {
        const prices = p.variants.map((v) => Number(v?.price)).filter((n) => Number.isFinite(n));
        if (prices.length) return Math.min(...prices);
      }
      return 0;
    };

    if (price === "low") data = data.filter((p) => getMinPrice(p) < 500000);
    if (price === "mid") data = data.filter((p) => getMinPrice(p) >= 500000 && getMinPrice(p) <= 2000000);
    if (price === "high") data = data.filter((p) => getMinPrice(p) > 2000000);

    if (rating === "3") data = data.filter((p) => getProductRating(p) >= 3);
    /* 5/5 sao: điểm trung bình gần tối đa trên thang 5 */
    if (rating === "5") data = data.filter((p) => getProductRating(p) >= 4.5);

    if (categoryFilter) {
      data = data.filter(
        (p) =>
          String(p?.categoryId?._id ?? p?.categoryId ?? "") === categoryFilter,
      );
    }

    if (sort === "priceAsc") data.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    if (sort === "priceDesc") data.sort((a, b) => getMinPrice(b) - getMinPrice(a));
    if (sort === "rating") data.sort((a, b) => getProductRating(b) - getProductRating(a));
    if (sort === "new") data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return data;
  }, [
    products,
    price,
    rating,
    sort,
    voucherScope,
    categoryFilter,
    getProductRating,
  ]);

  useEffect(() => {
    setPage(1);
  }, [price, rating, sort, voucherScope, categorySlug, categoryFilter]);

  useEffect(() => {
    if (categorySlug) setCategoryFilter("");
  }, [categorySlug]);

  const totalPage = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const showProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAllFilter = () => {
    setPrice("");
    setRating("");
    setSort("");
    setCategoryFilter("");
  };

  const togglePriceFilter = (nextValue) => {
    setPrice((prev) => (prev === nextValue ? "" : nextValue));
  };

  const toggleRatingFilter = (nextValue) => {
    setRating((prev) => (prev === nextValue ? "" : nextValue));
  };

  const selectCategoryFilter = (nextId) => {
    if (nextId === "") {
      setCategoryFilter("");
      return;
    }
    setCategoryFilter((prev) => (prev === nextId ? "" : nextId));
  };

  /** Số trang + dấu … khi danh sách dài */
  const paginationItems = useMemo(() => {
    const total = totalPage;
    const cur = page;
    if (total <= 1) return [];
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([1, total, cur, cur - 1, cur + 1]);
    const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < sorted.length; i += 1) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
      out.push(sorted[i]);
    }
    return out;
  }, [totalPage, page]);

  return (
    <div className="min-h-screen font-body pb-20 pt-20 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(79,70,229,0.09),transparent_50%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_40%,#f8fafc_100%)]">
      {/* Hero: breadcrumb + tiêu đề */}
      <div className="relative overflow-hidden border-b border-slate-200/60 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(79,70,229,0.03)_50%,transparent_60%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-100/30 blur-3xl"
          aria-hidden
        />
        <div className="container relative mx-auto max-w-7xl px-4 py-6 md:py-8">
          <nav
            className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-500"
            aria-label="Breadcrumb"
          >
            <Link
              to="/"
              className="rounded-lg px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Trang chủ
            </Link>
            <FaChevronRight className="mt-0.5 text-[9px] text-slate-300" aria-hidden />
            <span className="font-medium text-slate-700">
              {categoryLabel || "Sản phẩm"}
            </span>
          </nav>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-display mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                SneakerHouse
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl md:leading-[1.15]">
                {categoryLabel || "Sản phẩm"}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
                {categoryLabel
                  ? `Bộ sưu tập «${categoryLabel}» — lọc theo giá, đánh giá và sắp xếp như bạn muốn.`
                  : "Chọn lọc thông minh, so sánh giá nhanh — trải nghiệm mua sắm gọn gàng."}
              </p>
            </div>
            {!loading && (
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 px-4 py-3 shadow-sm shadow-slate-900/5">
                <div className="text-right sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Tổng
                  </p>
                  <p className="font-display text-2xl font-bold tabular-nums text-slate-900">
                    {filteredProducts.length}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  sản phẩm
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 pt-8">
        {voucherScope && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-cyan-50/40 px-4 py-4 shadow-md shadow-emerald-900/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-emerald-900">
                Voucher{" "}
                <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-emerald-800 ring-1 ring-emerald-100">
                  {String(voucherScope.code || "").toUpperCase()}
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/85">
                {Array.isArray(voucherScope.applicableProductIds) && voucherScope.applicableProductIds.length > 0
                  ? "Đang lọc sản phẩm được áp dụng mã này."
                  : "Mã áp dụng cho toàn bộ sản phẩm hiển thị."}
              </p>
            </div>
            <Link
              to={`/checkout?voucher=${encodeURIComponent(String(voucherScope.code || "").toUpperCase())}`}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-teal-500"
            >
              Thanh toán
            </Link>
          </div>
        )}

        {/* TOP FILTER BAR */}
        <div className="mb-7 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/60 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-100/90 to-slate-50 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200/70">
              <FaFilter className="shrink-0 text-primary" aria-hidden />
              {voucherLoading ? "Đang lọc voucher..." : `${filteredProducts.length} kết quả`}
            </span>
            {(price || rating || sort || categoryFilter) && (
              <button
                type="button"
                onClick={clearAllFilter}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100 transition-colors hover:bg-red-100/90"
              >
                <FaTimes className="text-[10px] shrink-0" aria-hidden /> Đặt lại bộ lọc
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
              <FaSortAmountDown className="text-slate-400 text-[13px]" aria-hidden />
              Sắp xếp
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-w-[168px] cursor-pointer rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-inner shadow-slate-900/5 outline-none transition hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/25"
            >
              <option value="">Nổi bật nhất</option>
              <option value="new">Hàng mới về</option>
              <option value="priceAsc">Giá: Thấp đến Cao</option>
              <option value="priceDesc">Giá: Cao đến Thấp</option>
              <option value="rating">Đánh giá cao</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* SIDEBAR FILTER */}
          <aside className="h-fit shrink-0 space-y-4 lg:sticky lg:top-24 lg:w-[270px]">
            {/* CATEGORY FILTER — ẩn khi đã lọc theo ?category= trên URL */}
            {!categorySlug && sidebarCategories.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
                <div className="border-b border-slate-100/90 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/50 px-4 py-3">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                    Danh mục giày
                  </h3>
                </div>
                <div className="max-h-[min(52vh,420px)] space-y-3 overflow-y-auto p-4">
                  {[
                    { id: "", label: "Tất cả danh mục" },
                    ...sidebarCategories.map((c) => ({
                      id: String(c._id),
                      label: c.name || "—",
                    })),
                  ].map((item) => (
                    <label
                      key={item.id || "all"}
                      className="group -mx-1 flex cursor-pointer items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-slate-50/80"
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="categoryFilter"
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-slate-300 transition-colors checked:border-primary"
                          checked={categoryFilter === item.id}
                          onClick={() => selectCategoryFilter(item.id)}
                          onChange={() => {}}
                        />
                        <div className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition-opacity peer-checked:opacity-100" />
                      </div>
                      <span className="text-sm text-slate-600 transition-colors group-hover:text-primary">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* PRICE FILTER */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100/90 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/50 px-4 py-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                  Khoảng giá
                </h3>
              </div>
              <div className="space-y-3 p-4">
                {[
                  { id: "low", label: "Dưới 500,000đ" },
                  { id: "mid", label: "500k - 2 Triệu" },
                  { id: "high", label: "Trên 2 Triệu" },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group rounded-lg py-0.5 -mx-1 px-1 hover:bg-slate-50/80 transition-colors">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="price"
                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-full checked:border-primary transition-colors cursor-pointer"
                        checked={price === item.id}
                        onClick={() => togglePriceFilter(item.id)}
                        onChange={() => {}}
                      />
                      <div className="absolute w-2.5 h-2.5 bg-primary rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <span className="text-slate-600 text-sm group-hover:text-primary transition-colors">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* RATING FILTER */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100/90 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/50 px-4 py-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                  Đánh giá
                </h3>
              </div>
              <div className="space-y-3 p-4">
                {[
                  { id: "3", label: "Từ 3/5 sao trở lên" },
                  { id: "5", label: "5/5 sao (từ 4,5 điểm)" },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group rounded-lg py-0.5 -mx-1 px-1 hover:bg-slate-50/80 transition-colors">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="rating"
                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-[4px] checked:border-primary checked:bg-primary transition-colors cursor-pointer"
                        checked={rating === item.id}
                        onClick={() => toggleRatingFilter(item.id)}
                        onChange={() => {}}
                      />
                      <FaCheck className="absolute text-white scale-0 peer-checked:scale-75 transition-transform pointer-events-none" size={10} />
                    </div>
                    <span className="text-slate-600 text-sm group-hover:text-primary transition-colors">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"
                  >
                    <div className="aspect-square bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
                    <div className="space-y-3 p-5">
                      <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-slate-200/90" />
                      <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
                      <div className="mt-6 h-10 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : showProducts.length === 0 ? (
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/90 p-10 text-center shadow-[0_20px_60px_-24px_rgba(15,23,42,0.15)] md:p-14">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.07] blur-2xl"
                  aria-hidden
                />
                <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-inner ring-1 ring-slate-200/80">
                  <span className="text-3xl" aria-hidden>
                    🛒
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Chưa có sản phẩm phù hợp
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Thử nới lỏng khoảng giá hoặc đặt lại bộ lọc để xem thêm kết quả.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilter}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-primary"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-1 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Kết quả
                    </h2>
                    <p className="text-xs text-slate-500">
                      Hiển thị{" "}
                      <span className="font-medium text-slate-700">
                        {(page - 1) * PAGE_SIZE + 1}–
                        {Math.min(page * PAGE_SIZE, filteredProducts.length)}
                      </span>{" "}
                      trong{" "}
                      <span className="font-medium text-slate-700">{filteredProducts.length}</span>{" "}
                      sản phẩm
                    </p>
                  </div>
                  {totalPage > 1 && (
                    <p className="text-xs font-medium text-slate-400">
                      Trang {page} / {totalPage}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
                  {showProducts.map((item) => (
                    <Product
                      key={item._id}
                      product={item}
                      ratingValue={getProductRating(item)}
                    />
                  ))}
                </div>

                {totalPage > 1 && (
                  <nav
                    className="mt-12 flex flex-wrap items-center justify-center gap-2"
                    aria-label="Phân trang"
                  >
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Trang trước"
                    >
                      <FaChevronLeft className="text-sm" />
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {paginationItems.map((item, idx) =>
                        item === "…" ? (
                          <span
                            key={`e-${idx}`}
                            className="px-1.5 text-slate-400"
                            aria-hidden
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPage(item)}
                            className={`min-h-[2.5rem] min-w-[2.5rem] rounded-xl px-2 text-sm font-semibold tabular-nums transition ${
                              page === item
                                ? "bg-gradient-to-b from-primary to-indigo-600 text-white shadow-md shadow-primary/30"
                                : "border border-slate-200/90 bg-white text-slate-600 hover:border-primary/35 hover:bg-slate-50"
                            }`}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={page >= totalPage}
                      onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Trang sau"
                    >
                      <FaChevronRight className="text-sm" />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;