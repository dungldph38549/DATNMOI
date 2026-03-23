import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Product from "../../components/Product/Product";
import { fetchProducts, getVoucherByCode } from "../../api";
import { FaFilter, FaTimes } from "react-icons/fa";

const PAGE_SIZE = 30;

const ProductPage = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voucherScope, setVoucherScope] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [sort, setSort] = useState("");
  const [price, setPrice] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts({ limit: 200, page: 0 });
        setProducts(res?.data ?? res ?? []);
      } catch (err) {
        console.error(err);
        setProducts([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const voucherCode = new URLSearchParams(location.search).get("voucher");
    if (!voucherCode) {
      setVoucherScope(null);
      return;
    }
    let cancelled = false;
    const loadVoucher = async () => {
      try {
        setVoucherLoading(true);
        const voucher = await getVoucherByCode(voucherCode);
        if (cancelled) return;
        setVoucherScope(voucher || null);
      } catch {
        if (!cancelled) setVoucherScope(null);
      } finally {
        if (!cancelled) setVoucherLoading(false);
      }
    };
    loadVoucher();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const filteredProducts = useMemo(() => {
    let data = [...products];
    const applicableIds = Array.isArray(voucherScope?.applicableProductIds)
      ? voucherScope.applicableProductIds.map((id) => String(id))
      : [];
    if (applicableIds.length > 0) {
      data = data.filter((p) => applicableIds.includes(String(p?._id)));
    }

    const getMinPrice = (p) => {
      const pr = p?.priceRange;
      if (pr && (pr.min != null || pr.max != null)) return Number(pr.min ?? 0) || 0;
      if (typeof p?.price === "number") return p.price;
      if (Array.isArray(p?.variants) && p.variants.length > 0) {
        const prices = p.variants.map((v) => Number(v?.price)).filter((n) => Number.isFinite(n));
        if (prices.length) return Math.min(...prices);
      }
      return 0;
    };

    if (price === "low") data = data.filter((p) => getMinPrice(p) < 500000);
    if (price === "mid") data = data.filter((p) => getMinPrice(p) >= 500000 && getMinPrice(p) <= 2000000);
    if (price === "high") data = data.filter((p) => getMinPrice(p) > 2000000);

    if (rating === "4") data = data.filter((p) => p.rating >= 4);
    if (rating === "3") data = data.filter((p) => p.rating >= 3);

    if (sort === "priceAsc") data.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    if (sort === "priceDesc") data.sort((a, b) => getMinPrice(b) - getMinPrice(a));
    if (sort === "rating") data.sort((a, b) => b.rating - a.rating);
    if (sort === "new") data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return data;
  }, [products, price, rating, sort, voucherScope]);

  const totalPage = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const showProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAllFilter = () => {
    setPrice("");
    setRating("");
    setSort("");
  };

  return (
    <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
      {/* HEADER / PAGE TITLE */}
      <div className="bg-slate-900 border-b border-slate-800 relative overflow-hidden mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 z-0"></div>
        <div className="container mx-auto px-4 max-w-7xl relative z-10 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-black text-white tracking-tight mb-4">
            The Collection.
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Khám phá những thiết kế tinh tế và độc đáo nhất dành riêng cho phong cách của bạn.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        {voucherScope && (
          <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-green-700">
                Đang chọn sản phẩm cho voucher: {String(voucherScope.code || "").toUpperCase()}
              </p>
              <p className="text-xs font-semibold text-green-600 mt-1">
                {Array.isArray(voucherScope.applicableProductIds) && voucherScope.applicableProductIds.length > 0
                  ? "Đang hiển thị các sản phẩm áp dụng voucher này."
                  : "Voucher áp dụng toàn bộ sản phẩm."}
              </p>
            </div>
            <Link
              to={`/checkout?voucher=${encodeURIComponent(String(voucherScope.code || "").toUpperCase())}`}
              className="h-10 px-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors inline-flex items-center"
            >
              Đi đến thanh toán
            </Link>
          </div>
        )}

        {/* TOP FILTER BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex gap-2">
            <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <FaFilter className="text-primary" /> {voucherLoading ? "Đang lọc voucher..." : `${filteredProducts.length} Items`}
            </span>
            {(price || rating || sort) && (
              <button onClick={clearAllFilter} className="bg-red-50 text-red-500 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors">
                <FaTimes /> Xoá bộ lọc
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-500">Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-primary focus:border-primary block px-4 py-2.5 outline-none transition-all cursor-pointer"
            >
              <option value="">Nổi bật nhất</option>
              <option value="new">Hàng mới về</option>
              <option value="priceAsc">Giá: Thấp đến Cao</option>
              <option value="priceDesc">Giá: Cao đến Thấp</option>
              <option value="rating">Đánh giá cao</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* SIDEBAR FILTER */}
          <aside className="lg:w-[280px] shrink-0 space-y-8 h-fit lg:sticky lg:top-28">
            {/* PRICE FILTER */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-display font-black text-slate-800 mb-6 uppercase tracking-wider relative inline-block">
                Khoảng Giá
                <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-primary rounded-full"></span>
              </h3>
              <div className="space-y-4">
                {[
                  { id: "low", label: "Dưới 500,000đ" },
                  { id: "mid", label: "500k - 2 Triệu" },
                  { id: "high", label: "Trên 2 Triệu" },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="price"
                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-full checked:border-primary transition-colors cursor-pointer"
                        checked={price === item.id}
                        onChange={() => setPrice(item.id)}
                      />
                      <div className="absolute w-2.5 h-2.5 bg-primary rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                    <span className="text-slate-600 font-medium group-hover:text-primary transition-colors">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* RATING FILTER */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-display font-black text-slate-800 mb-6 uppercase tracking-wider relative inline-block">
                Đánh Giá
                <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-primary rounded-full"></span>
              </h3>
              <div className="space-y-4">
                {[
                  { id: "4", label: "Từ 4 Sao Trở Lên" },
                  { id: "3", label: "Từ 3 Sao Trở Lên" },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="rating"
                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-[4px] checked:border-primary checked:bg-primary transition-colors cursor-pointer"
                        checked={rating === item.id}
                        onChange={() => setRating(item.id)}
                      />
                      <FaFilter className="absolute text-white scale-0 peer-checked:scale-75 transition-transform pointer-events-none" size={10} />
                    </div>
                    <span className="text-slate-600 font-medium group-hover:text-primary transition-colors">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl shadow-sm border border-slate-100 h-[400px] animate-pulse overflow-hidden">
                    <div className="h-[250px] bg-slate-200"></div>
                    <div className="p-6 space-y-4">
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-8 bg-slate-200 rounded w-1/3 mt-4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : showProducts.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-20 flex flex-col items-center justify-center text-center h-[500px]">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">😔</span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">No items found</h3>
                <p className="text-slate-500 max-w-md">Chúng tôi không tìm thấy sản phẩm nào phù hợp với bộ lọc của bạn. Hãy thử thay đổi tiêu chí nhé.</p>
                <button onClick={clearAllFilter} className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-primary transition-colors shadow-lg">Xóa bộ lọc</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {showProducts.map((item) => (
                    <Product key={item._id} product={item} />
                  ))}
                </div>

                {/* PAGINATION */}
                {totalPage > 1 && (
                  <div className="flex justify-center gap-2 mt-16 flex-wrap">
                    {[...Array(totalPage)].map((_, i) => {
                      const pNum = i + 1;
                      return (
                        <button
                          key={i}
                          onClick={() => setPage(pNum)}
                          className={`w-12 h-12 rounded-full font-bold transition-all shadow-sm flex items-center justify-center ${page === pNum
                              ? "bg-slate-900 text-white hover:scale-105"
                              : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
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
      </div>
    </div>
  );
};

export default ProductPage;
