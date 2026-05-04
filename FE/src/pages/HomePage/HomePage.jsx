import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaFire, FaGem, FaArrowRight, FaFilter } from "react-icons/fa";
import Product from "../../components/Product/Product";
import BannerSlider from "../../components/BannerSlider/BannerSlider";
import { CONVERSE_HOME_SPOTLIGHT_IMAGE } from "../../constants/converseHomePromo";
import {
  getBestSellers,
  getTopSellingProducts,
  getNewArrivals,
  fetchProducts,
  fetchRecommendProducts,
  getAllCategories,
} from "../../api";

/** Số sản phẩm hiển thị ở block "Sản phẩm mới" trên trang chủ. */
const HOME_NEW_PRODUCTS_COUNT = 8;

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isAccessoryProduct = (product) => {
  const categoryName = normalizeText(product?.categoryId?.name || product?.category || "");
  const slug = normalizeText(product?.categoryId?.slug || "");
  return (
    categoryName.includes("phu kien") ||
    categoryName.includes("phukien") ||
    categoryName.includes("accessor") ||
    slug.includes("phu-kien") ||
    slug.includes("accessories")
  );
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

const getSoldScore = (product) => {
  const baseSold = Number(product?.soldCount || product?.sold || 0);
  const variantSold = Array.isArray(product?.variants)
    ? product.variants.reduce((sum, variant) => sum + Number(variant?.sold || 0), 0)
    : 0;
  return baseSold + variantSold;
};

/** Hot: ưu tiên SP gắn cờ nổi bật, sau đó lượt bán (kể cả biến thể). */
const getHotScore = (product) => {
  const feat = product?.isFeatured ? 1_000_000 : 0;
  return feat + getSoldScore(product);
};

const getCreatedTimestamp = (product) =>
  new Date(product?.createdAt || product?.updatedAt || 0).getTime();

function readRecentProductIds() {
  try {
    const raw = localStorage.getItem("sh_recent_products_v1");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

const HomePage = () => {
  const userState = useSelector((s) => s.user);
  const recommendUserId =
    userState?.login ? String(userState._id || userState.id || "") : null;

  const [products, setProducts] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [accessoryProducts, setAccessoryProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [saleProductIds, setSaleProductIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("new");
  const categoryBtnRefs = useRef({});

  useEffect(() => {
    const load = async () => {
      try {
        const allTimeStart = new Date("2000-01-01T00:00:00.000Z");
        const recentIds = readRecentProductIds();

        const [newRes, topSellingRes, bestRes, allProductRes, recommendRes, categoryRes] =
          await Promise.all([
            getNewArrivals(48),
            getTopSellingProducts({
              limit: 24,
              startDate: allTimeStart.toISOString(),
              endDate: new Date().toISOString(),
            }).catch(() => ({ data: [] })),
            getBestSellers(48),
            fetchProducts({ limit: 400, page: 0 }).catch(() => ({ data: [] })),
            fetchRecommendProducts({
              userId: recommendUserId || undefined,
              limit: 8,
              offset: 0,
              tab: "all",
              recentIds,
            }).catch(() => ({ data: [] })),
            getAllCategories("all"),
          ]);

        setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);

        const newArr = Array.isArray(newRes?.data) ? newRes.data : [];
        const topSelling = Array.isArray(topSellingRes?.data) ? topSellingRes.data : [];
        const best = Array.isArray(bestRes?.data) ? bestRes.data : [];
        const allProducts = Array.isArray(allProductRes?.data) ? allProductRes.data : [];
        const recRaw = recommendRes?.data;
        const fromRecommend = Array.isArray(recRaw) ? recRaw : [];

        setProducts(allProducts.length ? allProducts : [...newArr, ...best]);

        setSaleProductIds(
          new Set(
            (allProducts.length ? allProducts : [...newArr, ...best])
              .filter((product) => isProductOnRealSale(product))
              .map((product) => String(product?._id || "")),
          ),
        );

        // —— Sản phẩm mới: mọi thời điểm (theo createdAt/updatedAt), mới nhất trước — không giới hạn 30 ngày như API new-arrivals
        const poolNew = allProducts.length > 0 ? allProducts : newArr;
        const allTimeNewest = [...poolNew]
          .filter((p) => p && String(p?._id || ""))
          .sort((a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a));
        setNewProducts(allTimeNewest.slice(0, HOME_NEW_PRODUCTS_COUNT));

        // —— Sản phẩm hot: ưu tiên top theo đơn (bán thực), bổ sung theo điểm hot (featured + bán)
        const hotIds = new Set();
        const hotList = [];
        for (const p of topSelling) {
          const id = String(p?._id || "");
          if (!id || hotIds.has(id)) continue;
          hotIds.add(id);
          hotList.push(p);
        }
        if (hotList.length < 8) {
          const pool =
            allProducts.length > 0
              ? [...allProducts]
              : [...best, ...newArr];
          const sorted = pool.sort((a, b) => getHotScore(b) - getHotScore(a));
          for (const p of sorted) {
            if (hotList.length >= 8) break;
            const id = String(p?._id || "");
            if (!id || hotIds.has(id)) continue;
            hotIds.add(id);
            hotList.push(p);
          }
        }
        setHotProducts(hotList.slice(0, 8));

        // —— Phụ kiện: lọc danh mục phụ kiện
        const accPool = (allProducts.length ? allProducts : newArr).filter(isAccessoryProduct);
        const accSorted = [...accPool].sort(
          (a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a),
        );
        setAccessoryProducts(accSorted.slice(0, 8));

        // —— Dành cho bạn: API /recommend (điểm + đã xem / đã mua)
        setRecommendedProducts(fromRecommend.slice(0, 8));
      } catch (err) {
        console.error("Load products error:", err);
      }
    };
    load();
  }, [recommendUserId]);

  let filterProducts = [...products];
  if (selectedCategory) {
    filterProducts = filterProducts.filter(
      (p) => (p.categoryId?.name || p.category) === selectedCategory,
    );
  }
  if (sort === "low") filterProducts.sort((a, b) => a.price - b.price);
  if (sort === "high") filterProducts.sort((a, b) => b.price - a.price);
  if (sort === "sold")
    filterProducts.sort((a, b) => getSoldScore(b) - getSoldScore(a));
  if (sort === "new")
    filterProducts.sort((a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a));

  const isFiltering = !!selectedCategory;
  const resultDisplay = isFiltering ? filterProducts : null;

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
      <BannerSlider />

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
        {isFiltering && (
          <section>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">Kết quả</h2>
              </div>
              <Link to="/product" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-convot-sage hover:underline">
                Xem tất cả <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(resultDisplay || []).map((p) => (
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

        {!isFiltering && newProducts.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-convot-sage font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
                  <FaGem /> Mới
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">Sản phẩm mới</h2>
              </div>
              <Link to="/product" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-convot-sage hover:underline">
                Xem tất cả <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newProducts.map((p) => (
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

        {!isFiltering && hotProducts.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-convot-sage font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
                  <FaFire /> Hot
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">Sản phẩm hot</h2>
              </div>
              <Link to="/product" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-convot-sage hover:underline">
                Xem tất cả <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotProducts.map((p) => (
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
                  <FaGem /> Phụ kiện
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-convot-charcoal">Phụ kiện</h2>
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

        <section className="group/spotlight relative w-full overflow-hidden rounded-[22px] border border-convot-sage/15 bg-white shadow-sm ring-1 ring-convot-sage/[0.07]">
          {/* Tỷ lệ ~1024:364 như banner mẫu; mobile xếp dọc, ảnh gọn */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:aspect-[1024/364]">
            <div className="relative order-2 flex flex-col justify-center bg-white px-5 py-5 md:order-1 md:px-8 md:py-4 lg:px-11">
              <span className="relative mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 md:text-sm">
                <span className="h-px w-9 bg-neutral-300" aria-hidden />
                Bộ sưu tập
              </span>
              <h3 className="relative font-display text-2xl font-bold leading-[1.08] tracking-tight text-convot-charcoal md:text-3xl lg:text-4xl">
                Đúng chất
                <br />
                <span className="text-convot-sage">Converse</span>
              </h3>
              <p className="relative mt-2 max-w-lg text-sm leading-relaxed text-neutral-500 md:mt-3 md:text-base">
                Canvas, da và phối màu được chọn lọc — phong cách đi học, đi chơi, mỗi ngày.
              </p>
              <Link
                to="/product"
                className="relative mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-convot-sage px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-convot-sage/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7a9680] md:mt-5 md:px-7 md:py-3 md:text-base"
              >
                Xem bộ sưu tập
                <FaArrowRight className="text-xs opacity-90 md:text-sm" aria-hidden />
              </Link>
            </div>
            <div className="relative order-1 aspect-[2/1] max-h-44 overflow-hidden max-md:w-full md:order-2 md:aspect-auto md:max-h-none md:h-full">
              <img
                src={CONVERSE_HOME_SPOTLIGHT_IMAGE}
                alt="Giày Converse — SneakerConverse"
                width={1600}
                height={1067}
                decoding="async"
                className="h-full min-h-full w-full object-cover object-center transition duration-[1.05s] ease-out group-hover/spotlight:scale-[1.04]"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default HomePage;
