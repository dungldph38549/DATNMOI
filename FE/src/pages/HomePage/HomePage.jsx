import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaFire, FaGem, FaArrowRight, FaFilter } from "react-icons/fa";
import Product from "../../components/Product/Product";
import BannerSlider from "../../components/BannerSlider/BannerSlider";
import {
  getFeaturedProducts,
  getBestSellers,
  getTopSellingProducts,
  getNewArrivals,
  getHomeRecommendations,
  fetchProducts,
  getAllCategories,
} from "../../api";

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

const getSoldScore = (product) => {
  const baseSold = Number(product?.soldCount || product?.sold || 0);
  const variantSold = Array.isArray(product?.variants)
    ? product.variants.reduce((sum, variant) => sum + Number(variant?.sold || 0), 0)
    : 0;
  return baseSold + variantSold;
};

const getCreatedTimestamp = (product) =>
  new Date(product?.createdAt || product?.updatedAt || 0).getTime();

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
        const [featuredRes, bestRes, topSellingRes, newRes, recommendationRes, allProductRes] = await Promise.all([
          getFeaturedProducts(8),
          getBestSellers(40),
          getTopSellingProducts({
            limit: 8,
            startDate: allTimeStart.toISOString(),
            endDate: new Date().toISOString(),
          }).catch(() => ({ data: [] })),
          getNewArrivals(8),
          getHomeRecommendations(8).catch(() => []),
          fetchProducts({ limit: 120, page: 0 }).catch(() => ({ data: [] })),
        ]);
        const categoryRes = await getAllCategories("all");
        setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);

        const featured = featuredRes?.data ?? [];
        const best = bestRes?.data ?? [];
        const topSelling = topSellingRes?.data ?? [];
        const newArr = newRes?.data ?? [];

        const allProducts = Array.isArray(allProductRes?.data) ? allProductRes.data : [];
        const bestSellerFromAll = allProducts
          .filter((p) => !isAccessoryProduct(p))
          .sort((a, b) => {
            const soldA = getSoldScore(a);
            const soldB = getSoldScore(b);
            return soldB - soldA;
          })
          .slice(0, 24);
        const bestSellerFromApi = [...topSelling]
          .filter((p) => !isAccessoryProduct(p))
          .sort((a, b) => getSoldScore(b) - getSoldScore(a))
          .slice(0, 24);
        const bestSellerFallback = [...best]
          .filter((p) => !isAccessoryProduct(p))
          .sort((a, b) => getSoldScore(b) - getSoldScore(a))
          .slice(0, 24);
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

        setSaleProductIds(
          new Set(
            allProducts
              .filter((product) => isProductOnRealSale(product))
              .map((product) => String(product?._id || "")),
          ),
        );
        const accessoryFromAll = allProducts.filter(isAccessoryProduct);
        const newestShoesFromAll = allProducts.filter((p) => !isAccessoryProduct(p));
        const newestShoesFromApi = newArr.filter((p) => !isAccessoryProduct(p));
        const newestShoePool = [...newestShoesFromAll, ...newestShoesFromApi];
        const newestShoeMap = new Map();
        newestShoePool.forEach((item) => {
          const id = String(item?._id || "");
          if (!id || newestShoeMap.has(id)) return;
          newestShoeMap.set(id, item);
        });
        const newestShoes = [...newestShoeMap.values()]
          .sort((a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a))
          .slice(0, 8);
        setNewProducts(newestShoes);

        const newestIds = new Set(newestShoes.map((item) => String(item?._id || "")));
        const hotPool = (bestSellerFromApi.length > 0
          ? bestSellerFromApi
          : bestSellerFromAll.length > 0
            ? bestSellerFromAll
            : bestSellerFallback
        ).filter((item) => !newestIds.has(String(item?._id || "")));
        setHotProducts(hotPool.slice(0, 8));
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
          setHotProducts(
            [...list]
              .filter((p) => !isAccessoryProduct(p))
              .sort((a, b) => getSoldScore(b) - getSoldScore(a))
              .slice(0, 8),
          );
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
      </div>
    </main>
  );
};

export default HomePage;
