import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductFilterSidebar from "../../components/ProductFilterSidebar/ProductFilterSidebar";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/cartSlice";

const ProductPage = () => {
  const [selectedSize, setSelectedSize] = useState(9);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/product");
        const data = await res.json();

        if (data.status !== "OK") {
          throw new Error(data.message || "Failed to fetch products");
        }

        setProducts(data.data || []);
      } catch (err) {
        setError(err.message || "Có lỗi khi tải sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <main className="flex-grow w-full px-10 lg:px-20 py-8 font-display">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-slate-500">
        <Link to="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <span className="material-symbols-outlined text-xs">
          chevron_right
        </span>
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          Giày thể thao
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <ProductFilterSidebar
          selectedSize={selectedSize}
          onChangeSize={setSelectedSize}
        />

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Giày thể thao nam</h1>

            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500">
                Hiển thị 1-12 trong tổng số 84 sản phẩm
              </p>

              <select className="text-sm border-slate-200 rounded-full bg-white dark:bg-slate-800 py-2 pl-4 pr-10 focus:ring-primary focus:border-primary">
                <option>Sắp xếp: Phổ biến</option>
                <option>Sắp xếp: Mới nhất</option>
                <option>Sắp xếp: Giá thấp đến cao</option>
                <option>Sắp xếp: Giá cao đến thấp</option>
              </select>
            </div>
          </div>

          {loading && (
            <p className="text-sm text-slate-500">
              Đang tải sản phẩm...
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500 mb-4">
              Lỗi: {error}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product._id}
                className="group relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-800"
              >
                <Link to={`/product/${product._id}`}>

                  {/* IMAGE */}
                  <div className="aspect-square overflow-hidden bg-slate-100 relative">
                    <img
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      src={product.image}
                      alt={product.name}
                    />

                    <button
                      type="button"
                      className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        favorite
                      </span>
                    </button>

                    {product.badge && (
                      <div className="absolute top-4 left-4">
                        <span
                          className={`${
                            product.badgeBg === "primary"
                              ? "bg-primary"
                              : "bg-slate-900"
                          } text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest`}
                        >
                          {product.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* PRODUCT INFO */}
                  <div className="p-6">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                      {product.type}
                    </p>

                    <h3 className="font-bold text-lg mb-2 truncate">
                      {product.name}
                    </h3>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-primary">
                          ${product.price.toFixed(2)}
                        </span>

                        {product.originalPrice && (
                          <span className="text-sm text-slate-400 line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          dispatch(
                            addToCart({
                              productId: product._id,
                              name: product.name,
                              image: product.image,
                              price: product.price,
                              qty: 1,
                            }),
                          );
                        }}
                        className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">
                          add_shopping_cart
                        </span>
                      </button>
                    </div>
                  </div>

                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-2">
              <button
                type="button"
                className="size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">
                  chevron_left
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPage(1)}
                className={`size-10 flex items-center justify-center rounded-lg font-bold ${
                  page === 1
                    ? "bg-primary text-white"
                    : "border border-slate-200 hover:bg-slate-100"
                }`}
              >
                1
              </button>

              <button
                type="button"
                onClick={() => setPage(2)}
                className={`size-10 flex items-center justify-center rounded-lg ${
                  page === 2
                    ? "bg-primary text-white"
                    : "border border-slate-200 hover:bg-slate-100"
                }`}
              >
                2
              </button>

              <button
                type="button"
                onClick={() => setPage(3)}
                className={`size-10 flex items-center justify-center rounded-lg ${
                  page === 3
                    ? "bg-primary text-white"
                    : "border border-slate-200 hover:bg-slate-100"
                }`}
              >
                3
              </button>

              <span className="px-2">...</span>

              <button
                type="button"
                className="size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100"
              >
                8
              </button>

              <button
                type="button"
                className="size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </button>
            </nav>
          </div>

        </div>
      </div>
    </main>
  );
};

export default ProductPage;