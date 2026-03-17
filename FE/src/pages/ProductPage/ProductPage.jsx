import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Product from "../../components/Product/Product";

const PAGE_SIZE = 30;

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sort, setSort] = useState("");
  const [price, setPrice] = useState("");
  const [rating, setRating] = useState("");

  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const res = await axios.get("http://localhost:3001/api/product");

        setProducts(res.data.data || []);
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
    };

    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    let data = [...products];

    if (price === "low") data = data.filter((p) => p.price < 500000);

    if (price === "mid")
      data = data.filter((p) => p.price >= 500000 && p.price <= 1000000);

    if (price === "high") data = data.filter((p) => p.price > 1000000);

    if (rating === "4") data = data.filter((p) => p.rating >= 4);

    if (rating === "3") data = data.filter((p) => p.rating >= 3);

    if (sort === "priceAsc") data.sort((a, b) => a.price - b.price);

    if (sort === "priceDesc") data.sort((a, b) => b.price - a.price);

    if (sort === "rating") data.sort((a, b) => b.rating - a.rating);

    if (sort === "new")
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return data;
  }, [products, price, rating, sort]);

  const totalPage = Math.ceil(filteredProducts.length / PAGE_SIZE);

  const showProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const clearAllFilter = () => {
    setPrice("");
    setRating("");
    setSort("");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* HEADER */}

      <div className="bg-white border-b">
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">Tất cả sản phẩm</h2>

          <select
            onChange={(e) => setSort(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="">Sắp xếp</option>
            <option value="priceAsc">Giá thấp → cao</option>
            <option value="priceDesc">Giá cao → thấp</option>
            <option value="rating">Rating cao</option>
            <option value="new">Mới nhất</option>
          </select>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 flex gap-8">
        {/* FILTER */}

        <div className="w-[230px] bg-white p-5 rounded-lg shadow-sm h-fit">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Bộ lọc</h3>

            {(price || rating || sort) && (
              <button
                onClick={clearAllFilter}
                className="text-sm text-red-500 hover:underline"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* PRICE */}

          <p className="text-sm font-medium mb-2">Khoảng giá</p>

          <div className="space-y-2 text-sm mb-5">
            <label className="flex gap-2 cursor-pointer">
              <input
                type="radio"
                checked={price === "low"}
                onChange={() => setPrice("low")}
              />
              Dưới 500k
            </label>

            <label className="flex gap-2 cursor-pointer">
              <input
                type="radio"
                checked={price === "mid"}
                onChange={() => setPrice("mid")}
              />
              500k - 1 triệu
            </label>

            <label className="flex gap-2 cursor-pointer">
              <input
                type="radio"
                checked={price === "high"}
                onChange={() => setPrice("high")}
              />
              Trên 1 triệu
            </label>
          </div>

          {/* RATING */}

          <p className="text-sm font-medium mb-2">Đánh giá</p>

          <div className="space-y-2 text-sm">
            <label className="flex gap-2 cursor-pointer">
              <input
                type="radio"
                checked={rating === "4"}
                onChange={() => setRating("4")}
              />
              ⭐ 4 sao trở lên
            </label>

            <label className="flex gap-2 cursor-pointer">
              <input
                type="radio"
                checked={rating === "3"}
                onChange={() => setRating("3")}
              />
              ⭐ 3 sao trở lên
            </label>
          </div>
        </div>

        {/* PRODUCT LIST */}

        <div className="flex-1">
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow h-[340px] animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && showProducts.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              Không có sản phẩm
            </div>
          )}

          {!loading && showProducts.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {showProducts.map((item) => (
                  <div
                    key={item._id}
                    className="hover:scale-105 transition duration-300"
                  >
                    <Product product={item} />
                  </div>
                ))}
              </div>

              {/* PAGINATION */}

              <div className="flex justify-center gap-2 mt-10 flex-wrap">
                {[...Array(totalPage)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-4 py-2 border rounded ${
                      page === i + 1 ? "bg-red-500 text-white" : "bg-white"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
