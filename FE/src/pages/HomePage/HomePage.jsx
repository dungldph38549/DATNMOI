import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/cartSlice";

const HomePage = () => {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/product");

        if (!res.ok) {
          throw new Error("Không thể tải danh sách sản phẩm từ server.");
        }

        let data;
        try {
          data = await res.json();
        } catch (parseError) {
          // Log chi tiết để debug nhưng không hiển thị thông báo kỹ thuật cho người dùng
          console.error("Lỗi parse JSON sản phẩm:", parseError);
          throw new Error("Dữ liệu sản phẩm trả về không hợp lệ.");
        }

        if (data.status !== "OK") {
          throw new Error(
            data.message || "Không thể tải danh sách sản phẩm.",
          );
        }

        setProducts((data.data || []).slice(0, 8));
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm:", err);
        setError("Hiện không thể tải sản phẩm. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <main className="flex-1 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Hero Section */}
      <section className="px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative min-h-[560px] flex flex-col justify-center overflow-hidden rounded-xl lg:rounded-xl p-8 lg:p-16 bg-slate-900 text-white group">
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-100 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAByHuzHMnvd_c6UEq7pqpzJTrxMD9z9JIJKouQIoyk1cbx4QeiCkydo6hBRKkJ2uVvSAPPQZE1WrOfdK7bcax8dvc7dF6eL27KVHey-a62O58MyxnrSegKcPlEmHfajJLEx0iKCaBMgMDm6NsUosmSS8Z7lb6BfydR3lgLDyS4bedy52vNPI5xI8DLEoYf27buPwELW7luLayp0-PM_eu3fQSq7RObMunX9lLksLPt4e-Qp-mosurWDmmefd3-yozfEQReA-CkQnU"
                alt="Premium orange and black sneakers"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 via-background-dark/40 to-transparent" />
            </div>
            <div className="relative z-10 max-w-xl space-y-6">
              <span className="inline-block px-4 py-1 bg-primary text-background-dark text-xs font-bold uppercase tracking-widest rounded-full">
                Phiên bản giới hạn
              </span>
              <h1 className="text-5xl lg:text-7xl font-black leading-tight">
                Nâng tầm từng bước chân
              </h1>
              <p className="text-lg text-slate-200">
                Dòng Air Pulse phiên bản giới hạn đã có mặt. Tối ưu cho hiệu năng,
                thiết kế cho phong cách đường phố.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  to="/product"
                  className="px-8 py-4 bg-primary text-background-dark font-bold rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
                >
                  Mua ngay
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/category"
                  className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-bold rounded-full border border-white/20 hover:bg-white/20 transition-all"
                >
                  Xem bộ sưu tập
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="px-6 lg:px-20 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Mua sắm theo danh mục</h2>
              <p className="text-slate-500 mt-1">
                Tìm đôi giày phù hợp với phong cách sống của bạn
              </p>
            </div>
            <Link
              to="/category"
              className="text-primary font-bold flex items-center gap-1 hover:underline"
            >
              Xem tất cả danh mục{" "}
              <span className="material-symbols-outlined text-sm">
                open_in_new
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category Card 1 */}
            <Link
              to="/category?type=Running"
              className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer block"
            >
              <img
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbtKp14mxnTdhy2GJG9uWRJcEgWpCU8ATDQEZF1tif4LVrtXTc-bWK2-DrpZlOpsCu3Ub7SoKdmR8e8LgJapBQs2044XxeCkqlBMhqiSoyiorQ76WCEUR-0fflMeXbllB0AYLviJxL9F3VY6OZdHC5BMfqFi820XGxvdNxYa6P6qUGmTfPK6cvpiVHwaMHMo8UHu2ELXyGZAbLWk5uIbDh1_wEsk4Y3SgdN196WNFnONhv9w-sMIYuXA5aYSPR8D1tLLSgx8s0RWo"
                alt="Red performance running shoe close up"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white mb-2">Running</h3>
                <button className="text-white text-sm font-semibold py-2 px-4 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary hover:text-background-dark transition-colors">
                  Khám phá
                </button>
              </div>
            </Link>

            {/* Category Card 2 */}
            <Link
              to="/category?type=Basketball"
              className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer block"
            >
              <img
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMBkXX8P53hvH3Ml0MhVpf-6G9NwCPu1USfMz5s4qmjBLn8EbPZ6iiOmJwX6GI9DmjIChlkma8Tjy38JJ6Njhq0lx_EwC8fYyQlst-_XSUqwFL2jXjb5D4J0GwWarsNExUTPDiWxhmuj0pgJtQMLoVHwC7hHfDxDVZlQdk6J1mCAofoMkWzRAY1_01xbOHJd_H6uJo8PQinGVQerhukUJpJ1ilJ8IbudpVwCuePHpG9H1CZRQM3Ux-QGFhsE1rF9bZolsiSoyjCao"
                alt="Modern high top basketball sneakers"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Basketball
                </h3>
                <button className="text-white text-sm font-semibold py-2 px-4 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary hover:text-background-dark transition-colors">
                  Khám phá
                </button>
              </div>
            </Link>

            {/* Category Card 3 */}
            <Link
              to="/category?type=Lifestyle"
              className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer block"
            >
              <img
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgZicS_k_2tddPzM9kgzUuoG4NNTwGeQLpmm3nfXibtyWxs9jRb0Hn8leieLwbcvoP6L36CUsWIyvWBuf8ccJNK8YjdJk2ZGSfjhtD5ghBrwrcygPfKOCEcYx1JN6ixOOMfVhazXi20UMyFI434jMrnc4-GH5Js9gd8j06InFFSNwY4EvzesHfm4rEMOm7GUFbISR7D3g0JvaKwXNP3ZfnNa_AGmTBoD--awfOe-z6D4PgYF4gqtktbPLzKII82bqm4bXenSj5Kbk"
                alt="Casual lifestyle sneakers on a minimalist background"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Lifestyle
                </h3>
                <button className="text-white text-sm font-semibold py-2 px-4 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary hover:text-background-dark transition-colors">
                  Khám phá
                </button>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* New Arrivals Grid */}
      <section className="px-6 lg:px-20 py-12 bg-primary/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">Xu hướng hiện nay</h2>
          {loading && (
            <p className="text-sm text-slate-500 text-center">
              Đang tải sản phẩm...
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center mb-6">
              Lỗi: {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((p) => (
              <div
                key={p._id}
                className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-primary/5 hover:shadow-xl transition-shadow group"
              >
                <Link to={`/product/${p._id}`}>
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-700 p-6">
                    <img
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      src={`http://localhost:3001/uploads/${p.image}`}
                      alt={p.name}
                    />
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">
                    {p.type}
                  </p>
                  <h4 className="font-bold text-lg mb-2 truncate">{p.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-primary">
                      ${Number(p.price || 0).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(
                          addToCart({
                            productId: p._id,
                            name: p.name,
                            image: p.image,
                            price: p.price,
                            qty: 1,
                          }),
                        )
                      }
                      className="bg-primary/20 hover:bg-primary p-2 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        add_shopping_cart
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/product"
              className="inline-block px-10 py-3 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary hover:text-background-dark transition-all"
            >
              Xem toàn bộ bộ sưu tập
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
