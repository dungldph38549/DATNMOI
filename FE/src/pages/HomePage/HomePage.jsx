import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaFire, FaGem, FaArrowRight, FaFilter } from "react-icons/fa";
import Product from "../../components/Product/Product";
import {
  getFeaturedProducts,
  getBestSellers,
  getNewArrivals,
  getHomeRecommendations,
  fetchProducts,
  getAllCategories,
} from "../../api";

/* Converse / Chuck Taylor — 6 ảnh hero */
const banners = [
  "https://images.unsplash.com/photo-1624636224909-d986525fb391?q=85&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1603217192634-61068e4d4bf9?q=85&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1578986175247-7d60c6df07c5?q=85&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1595184922849-05643a9ea3ce?q=85&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551583014-7ed375daad83?q=85&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581186088584-154ef8def9b6?q=85&w=2000&auto=format&fit=crop",
];

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isAccessoryProduct = (product) => {
  const categoryName = normalizeText(product?.categoryId?.name || product?.category || "");
  return (
    categoryName.includes("phu kien") ||
    categoryName.includes("phukien") ||
    categoryName.includes("accessor")
  );
};

const prioritizeShoes = (items = [], limit = 8) => {
  const list = Array.isArray(items) ? items : [];
  const shoes = list.filter((p) => !isAccessoryProduct(p));
  const accessories = list.filter((p) => isAccessoryProduct(p));
  return [...shoes, ...accessories].slice(0, limit);
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

const pickForRecommendation = ({
  recommendations = [],
  best = [],
  featured = [],
  newest = [],
  limit = 8,
  minShoes = 6,
}) => {
  const pools = [recommendations, best, featured, newest].map((arr) =>
    Array.isArray(arr) ? arr : [],
  );

  const seen = new Set();
  const unique = [];
  for (const pool of pools) {
    for (const item of pool) {
      const id = String(item?._id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(item);
    }
  }

  const shoes = unique.filter((p) => !isAccessoryProduct(p));
  const accessories = unique.filter((p) => isAccessoryProduct(p));
  const selectedShoes = shoes.slice(0, Math.min(minShoes, limit));
  const selectedAccessories = accessories.slice(0, Math.max(0, limit - selectedShoes.length));
  const mixed = [...selectedShoes, ...selectedAccessories];

  if (mixed.length < limit) {
    const selectedIds = new Set(mixed.map((p) => String(p?._id || "")));
    for (const item of unique) {
      const id = String(item?._id || "");
      if (!id || selectedIds.has(id)) continue;
      mixed.push(item);
      selectedIds.add(id);
      if (mixed.length >= limit) break;
    }
  }

  return mixed.slice(0, limit);
};

const HomePage = () => {
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && (user?.token || user?.name || user?.email));

  const [products, setProducts] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [accessoryProducts, setAccessoryProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [saleProductIds, setSaleProductIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("new");
  const [slide, setSlide] = useState(0);
  const categoryBtnRefs = useRef({});

  useEffect(() => {
    const interval = setInterval(() => setSlide((prev) => (prev + 1) % banners.length), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [featuredRes, bestRes, newRes, recommendationRes, allProductRes] = await Promise.all([
          getFeaturedProducts(8),
          getBestSellers(8),
          getNewArrivals(8),
          getHomeRecommendations(8).catch(() => []),
          fetchProducts({ limit: 120, page: 0 }).catch(() => ({ data: [] })),
        ]);
        const categoryRes = await getAllCategories("all");
        setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);

        const featured = featuredRes?.data ?? [];
        const best = bestRes?.data ?? [];
        const newArr = newRes?.data ?? [];

        setHotProducts(best.length > 0 ? best : featured.length > 0 ? featured : newArr);
        setRecommendedProducts(
          pickForRecommendation({
            recommendations: recommendationRes,
            best,
            featured,
            newest: newArr,
            limit: 8,
            minShoes: 6,
          }),
        );

        const allProducts = Array.isArray(allProductRes?.data) ? allProductRes.data : [];
        setSaleProductIds(
          new Set(
            allProducts
              .filter((product) => isProductOnRealSale(product))
              .map((product) => String(product?._id || "")),
          ),
        );
        const accessoryFromAll = allProducts.filter(isAccessoryProduct);
        const newestNonAccessory = allProducts
          .filter((p) => !isAccessoryProduct(p))
          .sort((a, b) => {
            const tA = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
            const tB = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
            return tB - tA;
          })
          .slice(0, 8);
        setNewProducts(
          newestNonAccessory.length > 0
            ? newestNonAccessory
            : newArr.filter((p) => !isAccessoryProduct(p)).length > 0
              ? newArr.filter((p) => !isAccessoryProduct(p))
              : featured.length > 0
                ? featured
                : best,
        );
        setAccessoryProducts(accessoryFromAll.slice(0, 8));

        if (featured.length > 0 || best.length > 0 || newArr.length > 0) {
          const mergedProducts = [...new Set([...best, ...featured, ...newArr].map((p) => p._id))]
            .map((id) => [...best, ...featured, ...newArr].find((x) => x._id === id))
            .filter(Boolean);
          setProducts(mergedProducts);
        } else {
          const allRes = await fetchProducts({ limit: 24, page: 0 });
          const list = allRes?.data ?? [];
          setProducts(list);
          setHotProducts(list.slice(0, 8));
          setNewProducts(list.slice(8, 16));
          if (!allProducts.length) {
            setAccessoryProducts(list.filter(isAccessoryProduct).slice(0, 8));
          }
        }
      } catch (err) {
        console.error("Load products error:", err);
      }
    };
    load();
  }, []);

  let filterProducts = [...products];
  if (selectedCategory) {
    filterProducts = filterProducts.filter((p) => (p.categoryId?.name || p.category) === selectedCategory);
  }
  if (sort === "low") filterProducts.sort((a, b) => a.price - b.price);
  if (sort === "high") filterProducts.sort((a, b) => b.price - a.price);
  if (sort === "sold") filterProducts.sort((a, b) => (b.soldCount || b.sold || 0) - (a.soldCount || a.sold || 0));

  const isFiltering = !!selectedCategory;
  const hotDisplay = isFiltering ? filterProducts : hotProducts;
  const newDisplay = newProducts;

  const scrollCategoryTabIntoView = (key) => {
    requestAnimationFrame(() => {
      const el = categoryBtnRefs.current[key];
      el?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    });
  };

  const selectCategory = (name, key) => {
    setSelectedCategory(name);
    scrollCategoryTabIntoView(key);
  };

  return (
    <main className="min-h-screen bg-convot-cream font-body text-convot-charcoal pb-16 md:pb-24">
      {/* Hero — carousel ảnh, giữ khung bo góc */}
      <section className="px-4 pt-6 md:pt-10 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-[28px] md:rounded-[32px] min-h-[420px] md:min-h-[520px] shadow-lg shadow-teal-500/10 ring-1 ring-white/40">
          {banners.map((img, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${slide === index ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"}`}
            >
              {/* Lớp màu trẻ trung: cam / hồng / cyan nhẹ — vẫn đọc được chữ */}
              <div
                className="absolute inset-0 z-[5] bg-gradient-to-br from-orange-300/18 via-fuchsia-300/12 to-cyan-300/16 mix-blend-soft-light"
                aria-hidden
              />
              <div
                className="absolute inset-0 z-[6] bg-gradient-to-t from-neutral-900/40 via-neutral-900/10 to-white/15"
                aria-hidden
              />
              <img
                src={img}
                alt=""
                className="relative z-0 w-full h-full object-cover object-center min-h-[420px] md:min-h-[520px] saturate-[1.08] contrast-[1.02]"
              />
            </div>
          ))}
          <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 py-16 md:py-24 min-h-[420px] md:min-h-[520px]">
            {isLoggedIn && (
              <p className="mb-4 text-base md:text-lg font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                Xin chào, {user?.name || user?.email?.split("@")[0] || "bạn"} 👋
              </p>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight max-w-4xl leading-[1.1] drop-shadow-lg">
              <span className="bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent">
                GIÀY MỚI
              </span>
              <br />
              <span className="text-white">— NĂNG ĐỘNG TỪNG BƯỚC</span>
            </h1>
            <p className="mt-5 md:mt-6 text-lg md:text-xl lg:text-2xl font-medium max-w-2xl text-white/95 drop-shadow-md leading-relaxed">
              Converse hot, màu sắc bùng nổ — mang phố đi cùng bạn mỗi ngày.
            </p>
            <div className="mt-8 md:mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to="/product"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-fuchsia-600 px-9 py-4 text-base md:text-lg font-bold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
              >
                Săn giày hot
              </Link>
              <Link
                to="/product"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/80 bg-white/15 px-7 py-4 text-base md:text-lg font-bold text-white backdrop-blur-md hover:bg-white/25 hover:scale-[1.02] transition-all"
              >
                Xem bộ sưu tập <FaArrowRight className="text-sm" />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-md mx-auto px-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 shrink-0 ${slide === i ? "w-8 sm:w-10 bg-gradient-to-r from-amber-300 to-cyan-300 shadow-[0_0_12px_rgba(250,204,21,0.6)]" : "w-2 sm:w-2.5 bg-white/50 hover:bg-white/80"}`}
                  aria-label={`Ảnh ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Danh mục */}
      <section className="relative z-10 -mt-6 mb-12 md:mb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-3 px-1 snap-x snap-mandatory scroll-smooth">
            <button
              ref={(el) => {
                categoryBtnRefs.current.__all__ = el;
              }}
              type="button"
              onClick={() => selectCategory("", "__all__")}
              className={`snap-center shrink-0 whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm border ${!selectedCategory ? "bg-convot-sage text-white border-convot-sage" : "bg-white text-convot-charcoal/80 border-convot-sage/20 hover:border-convot-sage/40"}`}
            >
              Tất cả
            </button>
            {categories.map((c) => {
              const cid = String(c._id);
              return (
              <button
                key={cid}
                ref={(el) => {
                  categoryBtnRefs.current[cid] = el;
                }}
                type="button"
                onClick={() => selectCategory(c.name, cid)}
                className={`snap-center shrink-0 whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm border ${selectedCategory === c.name ? "bg-convot-sage text-white border-convot-sage" : "bg-white text-convot-charcoal/80 border-convot-sage/20 hover:border-convot-sage/40"}`}
              >
                {c.name}
              </button>
            );
            })}
          </div>
        </div>
      </section>

      {isFiltering && (
        <section className="container mx-auto px-4 max-w-7xl mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-convot-sage/15 shadow-sm">
            <div className="flex items-center gap-2 text-convot-charcoal font-bold text-sm md:text-base">
              <FaFilter className="text-convot-sage" /> Lọc: {selectedCategory}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {["new", "sold", "low", "high"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`px-4 py-2 rounded-xl transition-all ${sort === s ? "bg-convot-charcoal text-white" : "bg-convot-cream text-convot-charcoal/70 hover:bg-convot-sage/10"}`}
                >
                  {s === "new" ? "Mới nhất" : s === "sold" ? "Bán chạy" : s === "low" ? "Giá tăng" : "Giá giảm"}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 max-w-7xl space-y-16 md:space-y-20">
        {(!isFiltering && newDisplay.length > 0) && (
          <section>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-convot-sage font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
                  <FaGem /> Mới nhất
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">Hàng mới nhất</h2>
              </div>
              <Link to="/product" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-convot-sage hover:underline">
                Xem tất cả <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newDisplay.map((p) => (
                <Product
                  key={p._id}
                  product={p}
                  compactCartCta
                  hoverStyle="catalog"
                  showSalePercentBadge={saleProductIds.has(String(p?._id || ""))}
                />
              ))}
            </div>
          </section>
        )}

        {!isFiltering && recommendedProducts.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-convot-sage font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
                  <FaGem /> Gợi ý
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">Dành cho bạn</h2>
              </div>
              <Link to="/product" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-convot-sage hover:underline">
                Xem tất cả <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedProducts.slice(0, 8).map((p) => (
                <Product
                  key={p._id}
                  product={p}
                  compactCartCta
                  hoverStyle="catalog"
                  showSalePercentBadge={saleProductIds.has(String(p?._id || ""))}
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[28px] overflow-hidden border border-convot-sage/15 bg-white shadow-sm">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-8 md:p-12 flex flex-col justify-center bg-gradient-to-br from-convot-cream to-white">
              <h3 className="text-2xl md:text-4xl font-display font-bold text-convot-charcoal leading-tight">
                Nâng tầm
                <br />
                hiệu suất
              </h3>
              <p className="mt-4 text-convot-charcoal/70 text-sm md:text-base leading-relaxed">
                Công nghệ đệm và upper được chọn lọc — cho từng km bạn chạy thêm.
              </p>
              <Link
                to="/product"
                className="mt-8 inline-flex w-fit items-center rounded-full bg-convot-sage px-6 py-3 text-sm font-bold text-white hover:bg-[#7a9680] transition"
              >
                Xem bộ sưu tập chạy bộ
              </Link>
            </div>
            <div className="relative min-h-[220px] md:min-h-[280px]">
              <img
                src="https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=1200&auto=format&fit=crop"
                alt="Khuyến mãi"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {((!isFiltering && hotDisplay.length > 0) || isFiltering) && (
          <section>
            <div className="flex items-end justify-between mb-8">
              <div>
                {!isFiltering && (
                  <span className="text-convot-sage font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
                    <FaFire /> Hot
                  </span>
                )}
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">
                  {isFiltering ? "Kết quả" : "Sản phẩm hot"}
                </h2>
              </div>
              <Link to="/product" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-convot-sage hover:underline">
                Xem tất cả <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotDisplay.map((p) => (
                <Product
                  key={p._id}
                  product={p}
                  compactCartCta
                  hoverStyle="catalog"
                  showSalePercentBadge={saleProductIds.has(String(p?._id || ""))}
                />
              ))}
            </div>
          </section>
        )}

        {!isFiltering && accessoryProducts.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-convot-sage font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
                  <FaGem /> Khác
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">Sản phẩm khác</h2>
              </div>
              <Link to="/accessories" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-convot-sage hover:underline">
                Xem tất cả <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {accessoryProducts.map((p) => (
                <Product
                  key={p._id}
                  product={p}
                  compactCartCta
                  hoverStyle="catalog"
                  showSalePercentBadge={saleProductIds.has(String(p?._id || ""))}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default HomePage;
