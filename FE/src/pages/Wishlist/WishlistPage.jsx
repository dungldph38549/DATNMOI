import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaHeart, FaShoppingCart, FaTrash, FaArrowRight, FaShoppingBag } from "react-icons/fa";
import { removeFromWishlist, clearWishlist } from "../../redux/wishlist/wishlistSlice";
import { addToCart } from "../../redux/cart/cartSlice";

const WishlistPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const items = useSelector((state) => state.wishlist.items || []);
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

    const handleMoveToCart = (product) => {
        if (!isLoggedIn) {
            alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
            navigate("/login");
            return;
        }

        // Logic check: if product has variants, must view detail
        if (Array.isArray(product.variants) && product.variants.length > 0) {
            navigate(`/product/${product._id}`);
            return;
        }

        dispatch(addToCart({
            productId: product._id,
            name: product.name,
            price: product.price,
            image: product.image,
            qty: 1
        }));
        // Optional: remove from wishlist after moving to cart
        // dispatch(removeFromWishlist(product._id));
        alert("Đã thêm vào giỏ hàng!");
    };

    return (
        <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
            {/* BRAEDCRUMBS MOCKUP */}
            <div className="container mx-auto px-4 max-w-7xl mb-8">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-slate-900">Yêu thích</span>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight mb-4">
                            Sản Phẩm Yêu Thích.
                        </h1>
                        <p className="text-slate-500 max-w-xl font-medium">
                            Lưu lại những đôi giày bạn yêu thích nhất để dễ dàng theo dõi và mua sắm sau này.
                        </p>
                    </div>
                    {items.length > 0 && (
                        <button 
                            onClick={() => dispatch(clearWishlist())}
                            className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50"
                        >
                            <FaTrash size={12} /> Xóa tất cả
                        </button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                            <FaHeart className="text-slate-200 text-4xl" />
                        </div>
                        <h2 className="text-2xl font-display font-black text-slate-800 mb-4">Danh sách yêu thích trống</h2>
                        <p className="text-slate-500 max-w-md mx-auto mb-10 leading-relaxed font-medium">
                            Bạn chưa lưu sản phẩm nào vào danh sách yêu thích. Hãy khám phá ngay những bộ sưu tập mới nhất của SneakerHouse!
                        </p>
                        <Link to="/product" className="bg-slate-900 text-white px-10 py-4 rounded-full font-bold hover:bg-primary transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 group">
                            Khám phá ngay <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {items.map((item) => (
                            <div key={item._id} className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 overflow-hidden flex flex-col">
                                <div className="relative aspect-square bg-slate-50 overflow-hidden">
                                    <Link to={`/product/${item._id}`}>
                                        <img 
                                            src={getImageUrl(item.image || item.srcImages?.[0])} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                        />
                                    </Link>
                                    <button 
                                        onClick={() => handleRemove(item._id)}
                                        className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-red-500 hover:text-white text-red-500 transition-all z-10"
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="font-display font-bold text-lg text-slate-800 mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[56px]">
                                        <Link to={`/product/${item._id}`}>{item.name}</Link>
                                    </h3>
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex flex-col">
                                            {((item?.priceRange?.min != null && item?.priceRange?.max != null) || (Array.isArray(item?.variants) && item.variants.length > 1)) && (
                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Giá từ</span>
                                            )}
                                            <span className="text-secondary font-black text-xl leading-none">
                                                {getDisplayPrice(item)}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleMoveToCart(item)}
                                            className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-primary transition-all shadow-lg shadow-slate-900/10"
                                            title="Thêm vào giỏ hàng"
                                        >
                                            <FaShoppingCart size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* RECENTLY VIEWED MOCKUP SECTION */}
                {items.length > 0 && (
                    <div className="mt-32">
                        <div className="flex items-center gap-6 mb-12">
                            <h2 className="text-3xl font-display font-black text-slate-900 whitespace-nowrap">Đừng bỏ lỡ.</h2>
                            <div className="h-px bg-slate-200 w-full"></div>
                        </div>
                        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 opacity-50"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                                <div className="max-w-xl text-center md:text-left">
                                    <h3 className="text-4xl md:text-5xl font-display font-black text-white mb-6 leading-tight">Hoàn thiện<br />Phong cách của bạn.</h3>
                                    <p className="text-slate-300 font-medium text-lg mb-10">Kết hợp đôi giày yêu thích của bạn với những phụ kiện độc đáo từ SneakerHouse.</p>
                                    <Link to="/product" className="inline-flex items-center gap-3 bg-white text-slate-900 px-10 py-4 rounded-full font-bold hover:bg-primary hover:text-white transition-all shadow-2xl">
                                        Tiếp tục mua sắm <FaShoppingBag />
                                    </Link>
                                </div>
                                <div className="hidden lg:block w-80 h-80 relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full"></div>
                                    <img src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a" alt="Promo" className="relative z-10 w-full h-full object-cover rounded-[3rem] shadow-2xl rotate-6 group-hover:rotate-0 transition-transform duration-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;
