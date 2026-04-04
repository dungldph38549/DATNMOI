import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Product from "../../components/Product/Product";
import { searchProducts } from "../../api";

const PAGE_SIZE = 15;

const normalize = (str = "") =>
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const keyword = (searchParams.get("q") || "").trim();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sort, setSort] = useState("");
  const [price, setPrice] = useState("");
  const [rating, setRating] = useState("");

  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!keyword) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await searchProducts({
          keyword,
          limit: 100,
          page: 0,
        });
        setProducts(res?.data ?? []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setProducts([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);


  const filteredProducts = useMemo(() => {

    let data = [...products];

    const getMinPrice = (p) => {
      const pr = p?.priceRange;
      if (pr && (pr.min != null || pr.max != null)) return Number(pr.min ?? 0) || 0;
      if (typeof p?.price === "number") return p.price;
      if (Array.isArray(p?.variants) && p.variants.length > 0) {
        const prices = p.variants
          .map((v) => Number(v?.price))
          .filter((n) => Number.isFinite(n));
        if (prices.length) return Math.min(...prices);
      }
      return 0;
    };

    if (keyword) {
      data = data.filter(p =>
        normalize(p.name).includes(normalize(keyword))
      );
    }

    if (price === "low") data = data.filter(p => getMinPrice(p) < 500000);

    if (price === "mid")
      data = data.filter(
        p => getMinPrice(p) >= 500000 && getMinPrice(p) <= 1000000
      );

    if (price === "high") data = data.filter(p => getMinPrice(p) > 1000000);

    if (rating === "3") data = data.filter(p => p.rating >= 3);

    if (rating === "5") data = data.filter(p => p.rating >= 4.5);

    if (sort === "priceAsc") data.sort((a, b) => getMinPrice(a) - getMinPrice(b));

    if (sort === "priceDesc") data.sort((a, b) => getMinPrice(b) - getMinPrice(a));

    if (sort === "rating") data.sort((a, b) => b.rating - a.rating);

    if (sort === "new")
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return data;

  }, [products, keyword, price, rating, sort]);


  const totalPage = Math.ceil(filteredProducts.length / PAGE_SIZE);

  const showProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );


  const clearPrice = () => setPrice("");
  const clearRating = () => setRating("");

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

          <h2 className="text-xl font-bold">
            🔎 Kết quả cho
            <span className="text-red-500 ml-2">"{keyword}"</span>
          </h2>

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

        <div className="w-[260px] bg-white p-5 rounded-2xl shadow-md border border-slate-100 h-fit">

          <div className="flex justify-between items-center mb-5">
            <h3 className="text-3xl font-black tracking-tight">Bộ lọc</h3>

            {(price || rating || sort) && (
              <button
                onClick={clearAllFilter}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>


          {/* PRICE */}

          <div className="flex justify-between items-center mb-2">

            <p className="text-base font-bold">Khoảng giá</p>

            {price && (
              <button
                onClick={clearPrice}
                className="text-xs text-red-500 hover:underline"
              >
                Hủy lọc
              </button>
            )}

          </div>

          <div className="space-y-2 text-sm mb-6">

            <label className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-50 transition">
              <input
                type="radio"
                checked={price === "low"}
                onChange={() => setPrice("low")}
                className="w-4 h-4"
              />
              <span className="font-medium">Dưới 500k</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-50 transition">
              <input
                type="radio"
                checked={price === "mid"}
                onChange={() => setPrice("mid")}
                className="w-4 h-4"
              />
              <span className="font-medium">500k - 1 triệu</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-50 transition">
              <input
                type="radio"
                checked={price === "high"}
                onChange={() => setPrice("high")}
                className="w-4 h-4"
              />
              <span className="font-medium">Trên 1 triệu</span>
            </label>

          </div>


          {/* RATING */}

          <div className="flex justify-between items-center mb-2 pt-2 border-t border-slate-100">

            <p className="text-base font-bold">Đánh giá</p>

            {rating && (
              <button
                onClick={clearRating}
                className="text-xs text-red-500 hover:underline"
              >
                Hủy lọc
              </button>
            )}

          </div>

          <div className="space-y-2 text-sm">

            <label className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-50 transition">
              <input
                type="radio"
                checked={rating === "3"}
                onChange={() => setRating("3")}
                className="w-4 h-4"
              />
              <span className="font-medium">⭐ Từ 3/5 sao trở lên</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-50 transition">
              <input
                type="radio"
                checked={rating === "5"}
                onChange={() => setRating("5")}
                className="w-4 h-4"
              />
              <span className="font-medium">⭐ 5/5 sao (từ 4,5 điểm)</span>
            </label>

          </div>

        </div>


        {/* PRODUCT LIST */}

        <div className="flex-1">

          {loading && (

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">

              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white h-[280px] rounded-lg shadow animate-pulse"
                />
              ))}

            </div>

          )}


          {!loading && showProducts.length === 0 && (

            <div className="text-center py-20 text-gray-500">
              Không tìm thấy sản phẩm
            </div>

          )}


          {!loading && showProducts.length > 0 && (

            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-7">

                {showProducts.map(item => (

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
                      page === i + 1
                        ? "bg-red-500 text-white"
                        : "bg-white"
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

export default SearchPage;