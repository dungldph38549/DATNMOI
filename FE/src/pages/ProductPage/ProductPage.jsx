import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductFilterSidebar from "../../components/ProductFilterSidebar/ProductFilterSidebar";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/cartSlice";

const API_URL = "http://localhost:3001";

const ProductPage = () => {
  const [selectedSize, setSelectedSize] = useState(9);
  const [products, setProducts] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch(`${API_URL}/api/product`);
      const data = await res.json();
      setProducts(data.data || []);
    };

    fetchProducts();
  }, []);

  return (

    <main className="flex-grow w-full px-10 lg:px-20 py-8 font-display">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-slate-500">
        <Link
          to="/product-detail"
          className="hover:text-primary transition-colors"
        >
          Home
        </Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          Sneakers
        </span>
      </div>

    <main className="flex-grow w-full px-10 lg:px-20 py-8">


      <div className="flex flex-col lg:flex-row gap-8">

        <ProductFilterSidebar
          selectedSize={selectedSize}
          onChangeSize={setSelectedSize}
        />

        <div className="flex-1">

          <h1 className="text-3xl font-bold mb-6">Sản phẩm</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {products.map((product) => (

              <div
                key={product._id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition"
              >

                <Link to={`/product/${product._id}`}>

                  <div className="aspect-square overflow-hidden">

                    <img
                      className="w-full h-full object-cover"
                      src={`${API_URL}/uploads/${product.image}`}
                      alt={product.name}
                    />

                  </div>

                  <div className="p-4">

                    <h3 className="font-bold text-lg">{product.name}</h3>

                    <p className="text-primary font-bold mt-2">
                      ${product.price}
                    </p>

                    <button
                      onClick={(e) => {
                        e.preventDefault();

                        dispatch(
                          addToCart({
                            productId: product._id,
                            name: product.name,
                            image: `${API_URL}/uploads/${product.image}`,
                            price: product.price,
                            qty: 1,
                          })
                        );
                      }}
                      className="mt-3 bg-primary text-white px-3 py-2 rounded"
                    >
                      Thêm giỏ
                    </button>

                  </div>

                </Link>

              </div>

            ))}


          {/* Pagination */}
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-2">
              <button
                type="button"
                className="size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">chevron_left</span>
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
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </nav>
          </div>

        </div>

      </div>

    </main>
  );
};

export default ProductPage;