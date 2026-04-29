import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaHeart, FaShoppingCart, FaTrash, FaArrowRight, FaTimes } from "react-icons/fa";
import { removeFromWishlist, clearWishlist } from "../../redux/wishlist/wishlistSlice";
import { addToCart } from "../../redux/cart/cartSlice";
import notify from "../../utils/notify";
import { getStocks } from "../../api";
import { isProductOutOfStock } from "../../utils/stock.js";

const WishlistPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [theme, setTheme] = useState("sporty");
    const items = useSelector((state) => state.wishlist.items || []);
    const cartItems = useSelector((state) => state.cart.items || []);
    const user = useSelector((state) => state.user);
    const isLoggedIn = !!(user?.login && user?.token);

    const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";

    const getImageUrl = (img) => {
        if (!img || typeof img !== "string") return PLACEHOLDER;
        if (img.startsWith("http")) return img;
        return `http://localhost:3002/uploads/${img.startsWith("/") ? img.slice(1) : img}`;
    };

    const getDisplayPrice = (p) => {
        // 1. Price Range
        const pr = p?.priceRange;
        if (pr && (pr.min != null || pr.max != null)) {
            const min = Number(pr.min ?? p?.price ?? 0);
            return `${min.toLocaleString("vi-VN")}₫`;
        }

        // 2. Variants
        if (Array.isArray(p?.variants) && p.variants.length > 0) {
            const prices = p.variants
                .map((v) => Number(v?.price))
                .filter((n) => Number.isFinite(n));
            if (prices.length > 0) {
                return `${Math.min(...prices).toLocaleString("vi-VN")}₫`;
            }
        }

        // 3. Single Price
        const single = Number(p?.price || 0);
        return `${single.toLocaleString("vi-VN")}₫`;
    };

    const handleRemove = (id) => {
        dispatch(removeFromWishlist(id));
    };

    const handleMoveToCart = async (product) => {
        if (isProductOutOfStock(product)) {
            notify.warning("Sản phẩm đã hết, vui lòng mua sản phẩm khác.");
            return;
        }

        if (!isLoggedIn) {
            notify.warning("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
            navigate("/login");
            return;
        }

        if (Array.isArray(product.variants) && product.variants.length > 0) {
            navigate(`/product/${product._id}`);
            return;
        }

        let maxStock = 0;
        try {
            const res = await getStocks([{ productId: product._id }]);
            const row = Array.isArray(res) ? res[0] : null;
            maxStock = Number(row?.countInStock ?? 0);
        } catch {
            notify.warning("Không kiểm tra được tồn kho. Thử lại sau.");
            return;
        }

        const alreadyInCart = cartItems.reduce((sum, i) => {
            if (String(i.productId) !== String(product._id)) return sum;
            const iSku =
                i.sku == null || String(i.sku).trim() === ""
                    ? null
                    : String(i.sku).trim().toUpperCase();
            if (iSku != null) return sum;
            return sum + Number(i.qty || 0);
        }, 0);

        const remaining = Math.max(0, maxStock - alreadyInCart);
        if (remaining <= 0) {
            notify.warning(
                maxStock <= 0
                    ? "Sản phẩm đã hết, vui lòng mua sản phẩm khác."
                    : "Đã đạt số lượng tối đa trong kho.",
            );
            return;
        }

        dispatch(addToCart({
            productId: product._id,
            name: product.name,
            price: product.price,
            image: product.image,
            qty: 1
        }));
    };

    const isSporty = theme === "sporty";

    return (
        <div
            className={`min-h-screen font-body pb-16 pt-10 md:pt-12 ${
                isSporty
                    ? "bg-gradient-to-b from-[#090909] via-[#111111] to-[#161616]"
                    : "bg-gradient-to-b from-[#fbf8f2] via-[#f8f5ee] to-[#f6f2ea]"
            }`}
        >
            <div className="container mx-auto max-w-7xl px-4">
                <section
                    className={`mb-8 rounded-3xl p-6 md:p-8 ${
                        isSporty
                            ? "border border-[#2e2e2e] bg-gradient-to-r from-[#131313] via-[#191919] to-[#202020] text-white shadow-[0_16px_45px_rgba(0,0,0,0.45)]"
                            : "border border-[#e8dcc8] bg-[#fffdf9] text-neutral-900 shadow-[0_12px_38px_rgba(68,51,24,0.08)]"
                    }`}
                >
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-3xl">
                            <span
                                className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                    isSporty
                                        ? "border border-[#3a3a3a] bg-[#1b1b1b] text-[#ff6b6b]"
                                        : "border border-[#e8dcc8] bg-[#fdf4e6] text-[#8b6a32]"
                                }`}
                            >
                                <FaHeart size={10} className={isSporty ? "text-[#ff4d4f]" : "text-[#b88a3b]"} />
                                Danh sách yêu thích
                            </span>
                            <h1 className={`font-display text-3xl font-bold leading-tight md:text-5xl ${isSporty ? "text-white" : "text-[#2a2116]"}`}>
                                Bộ sưu tập của bạn
                            </h1>
                            <p className={`mt-3 max-w-2xl text-sm leading-relaxed md:text-[15px] ${isSporty ? "text-neutral-300" : "text-[#6c5a3d]"}`}>
                                Lưu lại những đôi giày bạn muốn sở hữu. Tất cả sản phẩm được sắp xếp để bạn thêm vào giỏ nhanh hơn.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className={`rounded-2xl px-4 py-3 ${isSporty ? "border border-[#3a3a3a] bg-[#1a1a1a]" : "border border-[#e8dcc8] bg-[#fff8ee]"}`}>
                                <p className={`text-[11px] uppercase tracking-[0.12em] ${isSporty ? "text-[#ff8585]" : "text-[#8b6a32]"}`}>Tổng mục</p>
                                <p className={`mt-1 text-2xl font-semibold ${isSporty ? "text-white" : "text-[#2a2116]"}`}>{items.length}</p>
                            </div>
                            <div className={`inline-flex rounded-xl p-1 ${isSporty ? "border border-[#353535] bg-[#1b1b1b]" : "border border-[#e8dcc8] bg-[#f8f2e8]"}`}>
                                <button
                                    onClick={() => setTheme("luxury")}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${!isSporty ? "bg-white text-[#2a2116] shadow-sm" : "text-neutral-300 hover:text-white"}`}
                                >
                                    Luxury
                                </button>
                                <button
                                    onClick={() => setTheme("sporty")}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${isSporty ? "bg-[#ff3b30] text-white" : "text-[#6c5a3d] hover:text-[#2a2116]"}`}
                                >
                                    Sporty
                                </button>
                            </div>
                            {items.length > 0 && (
                                <button
                                    onClick={() => dispatch(clearWishlist())}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors ${
                                        isSporty
                                            ? "border border-[#4a2a2a] bg-[#2a1717] text-[#ffb5b5] hover:bg-[#3a1d1d] hover:text-white"
                                            : "border border-[#e8dcc8] bg-white text-[#6c5a3d] hover:bg-[#fff8ee] hover:text-[#2a2116]"
                                    }`}
                                >
                                    <FaTrash size={12} />
                                    Xóa tất cả
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {items.length === 0 ? (
                    <div className={`rounded-3xl p-14 text-center ${isSporty ? "border border-[#2f2f2f] bg-[#151515] shadow-[0_12px_32px_rgba(0,0,0,0.45)]" : "border border-[#e8dcc8] bg-[#fffdf9] shadow-[0_10px_30px_rgba(68,51,24,0.08)]"}`}>
                        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${isSporty ? "bg-[#231414]" : "bg-[#fbf2e2]"}`}>
                            <FaHeart className={`text-3xl ${isSporty ? "text-[#ff6b6b]" : "text-[#b88a3b]"}`} />
                        </div>
                        <h2 className={`mb-3 text-2xl font-black ${isSporty ? "text-white" : "text-[#2a2116]"}`}>Danh sách yêu thích trống</h2>
                        <p className={`mx-auto mb-8 max-w-xl ${isSporty ? "text-neutral-300" : "text-[#6c5a3d]"}`}>
                            Bạn chưa có sản phẩm nào trong danh sách yêu thích. Khám phá bộ sưu tập mới và lưu lại những mẫu bạn muốn sở hữu.
                        </p>
                        <Link
                            to="/product"
                            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors ${
                                isSporty ? "bg-[#ff3b30] hover:bg-[#e73026]" : "bg-[#2a2116] hover:bg-[#453521]"
                            }`}
                        >
                            Khám phá ngay
                            <FaArrowRight size={12} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-5 md:gap-6">
                        {items.map((item) => {
                            const outOfStock = isProductOutOfStock(item);
                            return (
                                <article key={item._id} className="group col-span-12 sm:col-span-6 lg:col-span-4">
                                    <div
                                        className={`h-full overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 ${
                                            isSporty
                                                ? "border border-[#2c2c2c] bg-[#161616] shadow-[0_10px_25px_rgba(0,0,0,0.4)] hover:border-[#3a3a3a] hover:shadow-[0_18px_38px_rgba(0,0,0,0.5)]"
                                                : "border border-[#e8dcc8] bg-[#fffdf9] shadow-[0_8px_22px_rgba(68,51,24,0.08)] hover:shadow-[0_16px_36px_rgba(68,51,24,0.14)]"
                                        }`}
                                    >
                                        <div className={`relative overflow-hidden ${isSporty ? "bg-[#0f0f0f]" : "bg-[#f7f1e6]"}`}>
                                            <Link to={`/product/${item._id}`} className="block">
                                                <img
                                                    src={getImageUrl(item.image || item.srcImages?.[0])}
                                                    alt={item.name}
                                                    className="h-[280px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                                                />
                                            </Link>

                                            {outOfStock && (
                                                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${isSporty ? "bg-[#b42318]" : "bg-[#2a2116]"}`}>
                                                    Hết hàng
                                                </span>
                                            )}

                                            <button
                                                onClick={() => handleRemove(item._id)}
                                                className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow transition-colors ${
                                                    isSporty
                                                        ? "bg-black/65 text-neutral-200 hover:bg-black/85 hover:text-white"
                                                        : "bg-white/90 text-[#6c5a3d] hover:bg-white hover:text-[#2a2116]"
                                                }`}
                                                aria-label="Xóa khỏi yêu thích"
                                            >
                                                <FaTimes size={12} />
                                            </button>
                                        </div>

                                        <div className="p-5">
                                            <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.08em] ${isSporty ? "text-[#ff8e8e]" : "text-[#9a7b45]"}`}>
                                                {item?.category?.name || item?.category || "Lifestyle / Performance"}
                                            </p>
                                            <Link
                                                to={`/product/${item._id}`}
                                                className={`block min-h-[56px] text-2xl font-semibold leading-tight transition-colors line-clamp-2 ${
                                                    isSporty
                                                        ? "text-white hover:text-[#ffb3b3]"
                                                        : "text-[#2a2116] hover:text-[#5b4630]"
                                                }`}
                                            >
                                                {item.name}
                                            </Link>

                                            <div className="mt-5 flex items-center justify-between gap-3">
                                                <p className={`text-2xl font-bold ${isSporty ? "text-white" : "text-[#2a2116]"}`}>
                                                    {getDisplayPrice(item)}
                                                </p>
                                                <button
                                                    onClick={() => handleMoveToCart(item)}
                                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                                                        outOfStock
                                                            ? (isSporty
                                                                ? "cursor-not-allowed bg-[#252525] text-[#6f6f6f]"
                                                                : "cursor-not-allowed bg-[#f2ebdf] text-[#b8a385]")
                                                            : (isSporty
                                                                ? "bg-[#ff3b30] text-white hover:bg-[#e73026]"
                                                                : "bg-[#2a2116] text-white hover:bg-[#453521]")
                                                    }`}
                                                    disabled={outOfStock}
                                                    title="Thêm vào giỏ hàng"
                                                >
                                                    <FaShoppingCart size={13} />
                                                    Thêm
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;
