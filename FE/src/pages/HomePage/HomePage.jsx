import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
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
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("new");
  const [slide, setSlide] = useState(0);

  const banners = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb",
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db",
  ];

  /* SLIDER */

  useEffect(() => {
    const interval = setInterval(() => {
      setSlide((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length]);

  /* FETCH PRODUCTS FROM BE */

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
            const p = [...best, ...featured, ...newArr].find((x) => x._id === id);
            return p;
          }).filter(Boolean));
        } else {
          const allRes = await fetchProducts({ limit: 24, page: 0 });
          const list = allRes?.data ?? [];
          setProducts(list);
          setHotProducts(list.slice(0, 8));
          setNewProducts(list.slice(8, 16));
        }
      } catch (err) {
        console.error("Load products:", err);
        try {
          const allRes = await fetchProducts({ limit: 24, page: 0 });
          const list = allRes?.data ?? [];
          const categoryRes = await getAllCategories("all");
          setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);
          setProducts(list);
          setHotProducts(list.slice(0, 8));
          setNewProducts(list.slice(8, 16));
        } catch (e) {
          setProducts([]);
          setCategories([]);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  /* FILTER */

  let filterProducts = [...products];

  if (selectedBrand) {
    filterProducts = filterProducts.filter(
      (p) => (p.brandId?.name || p.brand) === selectedBrand,
    );
  }

  if (selectedCategory) {
    filterProducts = filterProducts.filter(
      (p) => (p.categoryId?.name || p.category) === selectedCategory,
    );
  }

  /* SORT */

  if (sort === "low") {
    filterProducts.sort((a, b) => a.price - b.price);
  }

  if (sort === "high") {
    filterProducts.sort((a, b) => b.price - a.price);
  }

  if (sort === "sold") {
    filterProducts.sort((a, b) => (b.soldCount || b.sold || 0) - (a.soldCount || a.sold || 0));
  }

  const hotDisplay = filterProducts.length > 0 ? filterProducts.slice(0, 8) : hotProducts;
  const newDisplay = filterProducts.length > 0 ? filterProducts.slice(8, 16) : newProducts;

  const isFiltering = selectedBrand || selectedCategory;

  const PLACEHOLDER_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='28' font-family='Arial'>No Image</text></svg>";
  const getProductImageUrl = (p) => {
    const candidate =
      (typeof p?.image === "string" && p.image.trim()) ||
      (Array.isArray(p?.srcImages) && typeof p.srcImages[0] === "string"
        ? p.srcImages[0].trim()
        : "");

    if (!candidate) return PLACEHOLDER_IMG;
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return candidate;
    }
    if (candidate.startsWith("/uploads/")) {
      return `http://localhost:3002${candidate}`;
    }
    if (candidate.startsWith("uploads/")) {
      return `http://localhost:3002/${candidate}`;
    }
    return `http://localhost:3002/uploads/${candidate}`;
  };
  const onImgError = (e) => {
    e.target.onerror = null;
    e.target.src = PLACEHOLDER_IMG;
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* HERO */}

      <section className="relative h-[520px] overflow-hidden">
        {banners.map((img, index) => (
          <img
            key={index}
            src={img}
            alt=""
            className={`absolute w-full h-full object-cover transition-opacity duration-1000 ${slide === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}

        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute inset-0 flex items-center justify-center text-white text-center">
          <div>
            {isLoggedIn && (
              <p className="text-xl font-semibold mb-2">
                Chào, {user?.name || user?.email || "bạn"}!
              </p>
            )}
            <h1 className="text-5xl font-black mb-6">Sneaker Store</h1>

            <p className="text-lg mb-8">Phong cách bắt đầu từ đôi giày</p>

            <Link
              to="/product"
              className="bg-yellow-400 text-black px-10 py-4 rounded-full font-bold hover:scale-105 transition"
            >
              Mua ngay
            </Link>
          </div>
        </div>
      </section>

      {/* MAIN */}

      <section className="max-w-[1500px] mx-auto px-6 py-20 grid grid-cols-12 gap-14">
        {/* SIDEBAR */}

        <div className="col-span-3 space-y-8">
          {/* BRAND */}

          {/* <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-2xl font-bold mb-6 text-black">Thương hiệu</h3>

            <ul className="space-y-6 text-lg">
              <li
                onClick={() => setSelectedBrand("Puma")}
                className="flex items-center gap-4 cursor-pointer text-black hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <img
                  src="https://cdn.worldvectorlogo.com/logos/puma-logo.svg"
                  alt="Puma"
                  className="w-8 h-8 object-contain grayscale"
                />
                Puma
              </li>

              <li
                onClick={() => setSelectedBrand("Jordan Brand")}
                className="flex items-center gap-4 cursor-pointer text-black hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/en/3/37/Jumpman_logo.svg"
                  alt="Jordan Brand"
                  className="w-8 h-8 object-contain grayscale"
                />
                Jordan Brand
              </li>

              <li
                onClick={() => setSelectedBrand("Adidas")}
                className="flex items-center gap-4 cursor-pointer text-black hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg"
                  alt="Adidas"
                  className="w-8 h-8 object-contain grayscale"
                />
                Adidas
              </li>

              <li
                onClick={() => setSelectedBrand("Nike")}
                className="flex items-center gap-4 cursor-pointer text-black hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg"
                  alt="Nike"
                  className="w-8 h-8 object-contain grayscale"
                />
                Nike
              </li>
            </ul>
          </div> */}

          {/* CATEGORY */}

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-2xl font-bold mb-6 text-black">Danh mục</h3>

            <ul className="space-y-6 text-lg">
              <li
                onClick={() => setSelectedCategory("")}
                className="flex items-center gap-4 cursor-pointer text-black hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <span className="text-2xl grayscale">📦</span>
                Tất cả danh mục
              </li>

              {categories.map((c) => (
                <li
                  key={c._id}
                  onClick={() => setSelectedCategory(c.name)}
                  className="flex items-center gap-4 cursor-pointer text-black hover:bg-gray-100 p-2 rounded-lg transition"
                >
                  <span className="text-2xl grayscale">👟</span>
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* PRODUCT AREA */}

        <div className="col-span-9">
          {/* SORT */}

          <div className="flex items-center gap-6 mb-12">
            <p className="text-2xl font-bold">Sắp xếp theo:</p>

            <button
              onClick={() => setSort("new")}
              className={`px-6 py-3 rounded-lg font-semibold shadow transition
${sort === "new" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}
`}
            >
              Mới nhất
            </button>

            <button
              onClick={() => setSort("sold")}
              className={`px-6 py-3 rounded-lg font-semibold shadow transition
${sort === "sold" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}
`}
            >
              Bán chạy
            </button>

            <button
              onClick={() => setSort("low")}
              className={`px-6 py-3 rounded-lg font-semibold shadow transition
${sort === "low" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}
`}
            >
              Giá thấp → cao
            </button>

            <button
              onClick={() => setSort("high")}
              className={`px-6 py-3 rounded-lg font-semibold shadow transition
${sort === "high" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}
`}
            >
              Giá cao → thấp
            </button>
          </div>

          {/* HOT PRODUCTS */}

          {!isFiltering && (
            <>
              <h2 className="text-4xl font-bold text-center mb-12">
                🔥 SẢN PHẨM BÁN CHẠY
              </h2>

              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8 mb-20">
                {(loading ? [] : hotDisplay).map((p) => (
                  <Link
                    to={`/product/${p._id}`}
                    key={p._id}
                    className="bg-white rounded-2xl shadow hover:shadow-2xl transition p-6 block"
                  >
                    <img
                      src={getProductImageUrl(p)}
                      alt={p.name}
                      className="h-80 mx-auto object-contain"
                      onError={onImgError}
                    />

                    <h3 className="font-semibold text-lg mt-4 line-clamp-2">
                      {p.name}
                    </h3>

                    <p className="text-red-500 font-bold text-xl mt-2">
                      {Number(p.price).toLocaleString()}đ
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* NEW PRODUCTS */}

          {!isFiltering && (
            <>
              <h2 className="text-4xl font-bold text-center mb-12">
                ✨ SẢN PHẨM MỚI
              </h2>

              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
                {(loading ? [] : newDisplay).map((p) => (
                  <Link
                    to={`/product/${p._id}`}
                    key={p._id}
                    className="bg-white rounded-2xl shadow hover:shadow-2xl transition p-6 block"
                  >
                    <img
                      src={getProductImageUrl(p)}
                      alt={p.name}
                      className="h-80 mx-auto object-contain"
                      onError={onImgError}
                    />

                    <h3 className="font-semibold text-lg mt-4 line-clamp-2">
                      {p.name}
                    </h3>

                    <p className="text-red-500 font-bold text-xl mt-2">
                      {Number(p.price).toLocaleString()}đ
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* FILTER PRODUCTS */}

          {isFiltering && (
            <>
              <h2 className="text-4xl font-bold text-center mb-12">
                🛍 SẢN PHẨM
              </h2>

              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
                {filterProducts.map((p) => (
                  <Link
                    to={`/product/${p._id}`}
                    key={p._id}
                    className="bg-white rounded-2xl shadow hover:shadow-2xl transition p-6 block"
                  >
                    <img
                      src={getProductImageUrl(p)}
                      alt={p.name}
                      className="h-80 mx-auto object-contain"
                      onError={onImgError}
                    />

                    <h3 className="font-semibold text-lg mt-4 line-clamp-2">
                      {p.name}
                    </h3>

                    <p className="text-red-500 font-bold text-xl mt-2">
                      {Number(p.price).toLocaleString()}đ
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* VIEW ALL */}

          <div className="flex justify-center mt-20">
            <Link
              to="/product"
              className="bg-black text-white px-12 py-4 rounded-full font-bold hover:bg-red-500 transition"
            >
              Xem tất cả sản phẩm →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
