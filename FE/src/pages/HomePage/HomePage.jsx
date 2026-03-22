import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaFire, FaGem, FaArrowRight, FaFilter } from "react-icons/fa";
import Product from "../../components/Product/Product";
import {
  getFeaturedProducts,
  getBestSellers,
  getNewArrivals,
  fetchProducts,
  getAllCategories,
} from "../../api";

const HomePage = () => {
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && (user?.token || user?.name || user?.email));
  const [products, setProducts] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("new");
  const [slide, setSlide] = useState(0);

  const banners = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb",
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db",
  ];

  useEffect(() => {
    const interval = setInterval(() => setSlide((prev) => (prev + 1) % banners.length), 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [featuredRes, bestRes, newRes] = await Promise.all([
          getFeaturedProducts(8),
          getBestSellers(8),
          getNewArrivals(8),
        ]);
        const categoryRes = await getAllCategories("all");
        setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);
        const featured = featuredRes?.data ?? [];
        const best = bestRes?.data ?? [];
        const newArr = newRes?.data ?? [];

        setHotProducts(best.length > 0 ? best : featured.length > 0 ? featured : newArr);
        setNewProducts(newArr.length > 0 ? newArr : featured.length > 0 ? featured : best);

        if (featured.length > 0 || best.length > 0 || newArr.length > 0) {
          setProducts([...new Set([...best, ...featured, ...newArr].map((p) => p._id))].map((id) => {
            return [...best, ...featured, ...newArr].find((x) => x._id === id);
          }).filter(Boolean));
        } else {
          const allRes = await fetchProducts({ limit: 24, page: 0 });
          const list = allRes?.data ?? [];
          setProducts(list);
          setHotProducts(list.slice(0, 8));
          setNewProducts(list.slice(8, 16));
        }
      } catch (err) {
        console.error("Load products error:", err);
      }
      setLoading(false);
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

  const hotDisplay = filterProducts.length > 0 ? filterProducts.slice(0, 8) : hotProducts;
  const newDisplay = filterProducts.length > 0 ? filterProducts.slice(8, 16) : newProducts;
  const isFiltering = !!selectedCategory;


  return (
    <main className="bg-background-light min-h-screen font-body pb-24">
      {/* HERO HERO HERO */}
      <section className="relative h-[80vh] min-h-[600px] w-full overflow-hidden bg-background-dark pt-20">
        {banners.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${slide === index ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/80 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent z-10" />
            <img src={img} alt="Hero" className="w-full h-full object-cover object-center opacity-60" />
          </div>
        ))}

        <div className="relative z-20 h-full container mx-auto px-4 max-w-7xl flex flex-col justify-center">
          <div className="max-w-2xl">
            {isLoggedIn && (
              <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md">
                <p className="text-sm font-bold text-primary tracking-wide">
                  Welcome back, {user?.name || "Trendsetter"} ✨
                </p>
              </div>
            )}

            <h1 className="text-5xl md:text-7xl font-display font-black leading-[1.1] text-white mb-6 tracking-tight">
              Định Hình<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary animate-pulse">Phong Cách</span> Mới.
            </h1>

            <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed font-medium max-w-lg">
              Khám phá bộ sưu tập giới hạn với thiết kế độc quyền. Đánh thức sự tự tin qua từng bước chân.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/product" className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-slate-100 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Khám phá ngay
              </Link>
              <Link to="/product" className="group flex items-center gap-3 px-8 py-4 rounded-full font-bold text-white border border-slate-700 hover:bg-slate-800 transition-all duration-300">
                Bộ sưu tập <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL CATEGORY SCROLL */}
      <section className="relative -mt-10 z-30 mb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 px-2 snap-x snap-mandatory">
            <button
              onClick={() => setSelectedCategory("")}
              className={`snap-start whitespace-nowrap px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl backdrop-blur-xl ${!selectedCategory ? 'bg-primary text-white shadow-primary/30 scale-105' : 'bg-surface/80 text-slate-600 hover:bg-white'} border border-slate-200/50`}
            >
              All Drops
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedCategory(c.name)}
                className={`snap-start whitespace-nowrap px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl backdrop-blur-xl ${selectedCategory === c.name ? 'bg-primary text-white shadow-primary/30 scale-105' : 'bg-surface/80 text-slate-600 hover:bg-white'} border border-slate-200/50`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FILTER CONTROLS */}
      {isFiltering && (
        <section className="container mx-auto px-4 max-w-7xl mb-12">
          <div className="flex flex-wrap items-center justify-between gap-6 bg-surface p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 text-slate-800 font-bold text-lg">
              <FaFilter className="text-primary" /> Lọc kết quả: {selectedCategory}
            </div>

            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              {['new', 'sold', 'low', 'high'].map(s => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-5 py-2.5 rounded-xl transition-all ${sort === s ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {s === 'new' ? 'Mới nhất' : s === 'sold' ? 'Bán chạy' : s === 'low' ? 'Giá tăng dần' : 'Giá giảm dần'}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRODUCT GRIDS */}
      <section className="container mx-auto px-4 max-w-7xl space-y-24">

        {/* NEW ARRIVALS */}
        {(!isFiltering && newDisplay.length > 0) && (
          <div>
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-2 block flex items-center gap-2"><FaGem /> The Latest</span>
                <h2 className="text-4xl md:text-5xl font-display font-black text-slate-800 tracking-tight">New Arrivals.</h2>
              </div>
              <Link to="/product" className="hidden md:flex items-center gap-2 font-bold text-slate-400 hover:text-primary transition-colors">
                View All <FaArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {newDisplay.map((p) => (
                <Product key={p._id} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* PROMO BANNER */}
        <div className="rounded-[3rem] overflow-hidden relative bg-slate-900 group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
          <div className="relative z-10 px-8 py-20 md:p-24 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="max-w-xl text-center md:text-left">
              <h3 className="text-4xl md:text-6xl font-display font-black text-white mb-6 leading-tight">Elevate Your<br />Performance.</h3>
              <p className="text-lg text-slate-300 font-medium mb-8">Khám phá công nghệ đệm mới nhất giúp hoàn trả năng lượng tối đa trong từng bước chạy.</p>
              <Link to="/product" className="inline-flex bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-primary hover:text-white transition-all duration-300 shadow-xl shadow-black/20">
                Mua BST Chạy Bộ
              </Link>
            </div>
            <div className="w-64 h-64 md:w-96 md:h-96 relative">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
              <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c" alt="Promo" className="relative z-10 w-full h-full object-cover rounded-full border-4 border-white/10 shadow-2xl" />
            </div>
          </div>
        </div>

        {/* TRENDING / HOT */}
        {((!isFiltering && hotDisplay.length > 0) || isFiltering) && (
          <div>
            <div className="flex items-end justify-between mb-10">
              <div>
                {!isFiltering && <span className="text-primary font-bold tracking-widest uppercase text-sm mb-2 block flex items-center gap-2"><FaFire /> In Demand</span>}
                <h2 className="text-4xl md:text-5xl font-display font-black text-slate-800 tracking-tight">
                  {isFiltering ? "Kết quả" : "Trending Now."}
                </h2>
              </div>
              <Link to="/product" className="hidden md:flex items-center gap-2 font-bold text-slate-400 hover:text-primary transition-colors">
                View All <FaArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {(isFiltering ? filterProducts : hotDisplay).map((p) => (
                <Product key={p._id} product={p} />
              ))}
            </div>
          </div>
        )}

      </section>
    </main>
  );
};

export default HomePage;
