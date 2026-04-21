import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaHeart, FaShoppingCart, FaTrash, FaArrowRight, FaTimes } from "react-icons/fa";
import { removeFromWishlist, clearWishlist } from "../../redux/wishlist/wishlistSlice";
import { addToCart } from "../../redux/cart/cartSlice";
import notify from "../../utils/notify";
import { getStocks } from "../../api";

const WishlistPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
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

    return (
        <div className="min-h-screen bg-[#f7f6f3] font-body pt-12 pb-16">
            <div className="container mx-auto px-4 max-w-7xl">
                <section className="mb-10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="max-w-3xl">
                            <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-black md:text-5xl lg:text-[2.75rem] mb-3">
                                SẢN PHẨM YÊU THÍCH.
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm md:text-sm text-neutral-600">
                                Nơi lưu giữ những thiết kế làm đắc của bạn. Danh sách được cá nhân hóa dựa trên gu thẩm mỹ và những lựa chọn tinh tuyển từ các bộ sưu tập mới nhất.
                            </p>
                        </div>
                        {items.length > 0 && (
                            <button
                                onClick={() => dispatch(clearWishlist())}
                                className="shrink-0 mt-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors inline-flex items-center gap-2"
                            >
                                <FaTrash size={12} />
                                Xóa tất cả
                            </button>
                        )}
                    </div>
                </section>

                {items.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-neutral-200 p-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-neutral-100 mx-auto flex items-center justify-center mb-6">
                            <FaHeart className="text-neutral-400 text-3xl" />
                        </div>
                        <h2 className="text-2xl font-black text-neutral-900 mb-3">Danh sách yêu thích trống</h2>
                        <p className="text-neutral-500 mb-8 max-w-xl mx-auto">
                            Bạn chưa có sản phẩm nào trong danh sách yêu thích. Khám phá bộ sưu tập mới và lưu lại những mẫu bạn muốn sở hữu.
                        </p>
                        <Link
                            to="/product"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition-colors"
                        >
                            Khám phá ngay
                            <FaArrowRight size={12} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-7">
                        {items.map((item, index) => {
                            const isFeature = index === 2;
                            return (
                                <article
                                    key={item._id}
                                    className={`group col-span-12 sm:col-span-6 ${isFeature ? "lg:col-span-6" : "lg:col-span-3"}`}
                                >
                                    <div className="relative rounded-md overflow-hidden bg-neutral-200">
                                        <Link to={`/product/${item._id}`} className="block">
                                            <img
                                                src={getImageUrl(item.image || item.srcImages?.[0])}
                                                alt={item.name}
                                                className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${isFeature ? "h-[300px] md:h-[380px]" : "h-[260px] md:h-[300px]"}`}
                                            />
                                        </Link>

                                        <button
                                            onClick={() => handleRemove(item._id)}
                                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 text-neutral-700 hover:bg-white hover:text-neutral-900 shadow flex items-center justify-center transition-colors"
                                            aria-label="Xóa khỏi yêu thích"
                                        >
                                            <FaTimes size={12} />
                                        </button>

                                        {isFeature && (
                                            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/75 via-black/35 to-transparent text-white">
                                                <p className="text-[10px] tracking-[0.2em] uppercase text-white/70 mb-2">Limitless Collection</p>
                                                <h3 className="text-3xl font-black mb-3 leading-tight line-clamp-2">{item.name}</h3>
                                                <button
                                                    onClick={() => handleMoveToCart(item)}
                                                    className="px-4 py-2 rounded-full text-xs font-bold bg-white text-neutral-900 hover:bg-neutral-200 transition-colors inline-flex items-center gap-2"
                                                >
                                                    <FaShoppingCart size={12} />
                                                    Thêm vào giỏ
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {!isFeature && (
                                        <div className="pt-3">
                                            <Link to={`/product/${item._id}`} className="block font-semibold text-[28px] text-neutral-900 leading-tight line-clamp-2 hover:text-neutral-700 transition-colors">
                                                {item.name}
                                            </Link>
                                            <p className="text-xs text-neutral-400 mt-1">
                                                {item?.category?.name || item?.category || "Lifestyle / Performance"}
                                            </p>
                                            <div className="flex items-center justify-between mt-3">
                                                <p className="text-xl font-bold text-neutral-900">
                                                    {getDisplayPrice(item)}
                                                </p>
                                                <button
                                                    onClick={() => handleMoveToCart(item)}
                                                    className="w-10 h-10 rounded-full border border-neutral-300 text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 flex items-center justify-center transition-colors"
                                                    title="Thêm vào giỏ hàng"
                                                >
                                                    <FaShoppingCart size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {isFeature && (
                                        <p className="text-xl font-bold text-neutral-900 mt-3">
                                            {getDisplayPrice(item)}
                                        </p>
                                    )}
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
