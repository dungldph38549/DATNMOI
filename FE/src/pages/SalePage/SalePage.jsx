import React, { useEffect, useMemo, useState } from "react";
import Product from "../../components/Product/Product";
import { fetchProducts } from "../../api";

const PAGE_SIZE = 24;

const SalePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("discount");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts({ limit: 300, page: 0 });
        const all = res?.data ?? res ?? [];
        setProducts(Array.isArray(all) ? all : []);
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saleProducts = useMemo(() => {
    const getDiscountPercent = (p) => {
      const original = Number(p?.originalPriceRange?.min ?? p?.originalPrice ?? p?.price ?? 0);
      const effective = Number(p?.priceRange?.min ?? p?.effectivePrice ?? p?.salePrice ?? p?.price ?? 0);
      if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(effective)) return 0;
      return Math.max(0, Math.round(((original - effective) / original) * 100));
    };

    const getEffectivePrice = (p) =>
      Number(p?.priceRange?.min ?? p?.effectivePrice ?? p?.salePrice ?? p?.price ?? 0) || 0;

    const onlySale = (products || []).filter((p) => p?.hasSale === true || getDiscountPercent(p) > 0);
    if (sort === "priceAsc") {
      return [...onlySale].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    }
    if (sort === "priceDesc") {
      return [...onlySale].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    }
    return [...onlySale].sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
  }, [products, sort]);

  const totalPage = Math.max(1, Math.ceil(saleProducts.length / PAGE_SIZE));
  const showProducts = saleProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
      <div className="bg-slate-900 border-b border-slate-800 relative overflow-hidden mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/30 to-primary/20 z-0"></div>
        <div className="container mx-auto px-4 max-w-7xl relative z-10 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-black text-white tracking-tight mb-4">
            Sale Up To 50%.
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg">
            Tất cả sản phẩm đang giảm giá được tổng hợp tại đây.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <span className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-bold">
            {saleProducts.length} sản phẩm đang sale
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-500">Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 outline-none"
            >
              <option value="discount">Giảm giá cao nhất</option>
              <option value="priceAsc">Giá thấp đến cao</option>
              <option value="priceDesc">Giá cao đến thấp</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-sm border border-slate-100 h-[380px] animate-pulse"></div>
            ))}
          </div>
        ) : showProducts.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center">
            <h3 className="text-2xl font-black text-slate-800 mb-2">Hiện chưa có sản phẩm sale</h3>
            <p className="text-slate-500">Bạn quay lại sau nhé, chương trình ưu đãi sẽ cập nhật liên tục.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {showProducts.map((item) => (
                <Product key={item._id} product={item} />
              ))}
            </div>
            {totalPage > 1 && (
              <div className="flex justify-center gap-2 mt-12 flex-wrap">
                {[...Array(totalPage)].map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-11 h-11 rounded-full font-bold transition-all ${
                        page === pNum
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-500 border border-slate-200"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalePage;
