import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaSearch, FaUser, FaChevronDown, FaHeart, FaBoxOpen } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { clearUser } from "../../redux/user";
import notify from "../../utils/notify";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart.items || []);
  const wishlist = useSelector((state) => state.wishlist.items || []);
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && user?.token);
  const cartLineCount = isLoggedIn ? cart.length : 0;

  const [keyword, setKeyword] = useState("");

  const goHome = () => navigate("/");

  const goCart = () => {
    if (!isLoggedIn) {
      notify.warning("Vui long dang nhap de xem gio hang.");
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    navigate("/cart");
  };

  const goOrders = () => {
    if (!isLoggedIn) {
      notify.warning("Vui long dang nhap de xem don hang.");
      navigate("/login", { state: { from: "/orders" } });
      return;
    }
    navigate("/orders");
  };

  const goLogin = () => navigate("/login");

  const handleLogout = () => {
    dispatch(clearUser());
    navigate("/", { replace: true });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (keyword.trim() === "") return;
    navigate(`/search?q=${keyword}`);
  };

  return (
    <header className="sticky top-0 w-full z-50 flex flex-col font-body bg-white shadow-sm border-b border-gray-100">

      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4">
        <div className="container mx-auto flex justify-between items-center max-w-7xl">
          <div className="flex gap-4 font-bold tracking-wide">
            <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">VND <FaChevronDown size={10} /></span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">Tiếng Việt <FaChevronDown size={10} /></span>
          </div>
          <div className="hidden md:flex gap-6 font-bold">
            <span className="hover:text-primary transition-colors cursor-pointer text-slate-400">Trợ giúp & FAQ</span>
            <span className="hover:text-primary transition-colors cursor-pointer text-slate-400">Theo dõi bộ sưu tập</span>
          </div>
        </div>
      </div>

      {/* MAIN NAVBAR */}
      <div className="py-4">
        <div className="container mx-auto px-4 max-w-7xl flex flex-wrap items-center justify-between gap-4 lg:gap-8">

          {/* BRAND LOGO */}
          <div onClick={goHome} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-display font-black text-xl shadow-lg group-hover:scale-105 transition-transform">
              SH
            </div>
            <h1 className="text-2xl font-display font-black tracking-tight text-slate-900 drop-shadow-sm">
              SNEAKER<span className="text-primary">HOUSE</span>
            </h1>
          </div>

          {/* SEARCH BOX */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl items-center bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 transition-all overflow-hidden group">
            <div className="pl-5 pr-2 py-3 text-slate-400 group-focus-within:text-primary transition-colors">
              <FaSearch size={16} />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Bạn muốn tìm giày gì hôm nay?"
              className="flex-1 bg-transparent px-3 py-3 outline-none text-slate-700 text-sm font-bold placeholder-slate-400"
            />
            <button type="submit" className="hidden"></button>
          </form>

          {/* ACTION BUTTONS (Gọn gàng, 1 dòng) */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* WISHLIST BUTTON */}
            <Link to="/wishlist" className="flex items-center gap-2 cursor-pointer group px-3 md:px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors relative">
              <FaHeart size={20} className="text-slate-700 group-hover:text-red-500 transition-colors" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 left-6 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {wishlist.length}
                </span>
              )}
              <span className="hidden lg:block text-sm font-bold text-slate-700 group-hover:text-red-500 transition-colors">Yêu thích</span>
            </Link>

            {/* ORDERS BUTTON */}
            <div onClick={goOrders} className="flex items-center gap-2 cursor-pointer group px-3 md:px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors relative">
              <FaBoxOpen size={20} className="text-slate-700 group-hover:text-primary transition-colors" />
              <span className="hidden lg:block text-sm font-bold text-slate-700 group-hover:text-primary transition-colors ml-1">Đơn hàng</span>
            </div>

            {/* CART BUTTON */}
            <div onClick={goCart} className="flex items-center gap-2 cursor-pointer group px-3 md:px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors relative">
              <FaShoppingCart size={20} className="text-slate-700 group-hover:text-primary transition-colors" />
              {cartLineCount > 0 && (
                <span className="absolute top-1 left-6 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {cartLineCount}
                </span>
              )}
              <span className="hidden lg:block text-sm font-bold text-slate-700 group-hover:text-primary transition-colors ml-1">Giỏ hàng</span>
            </div>

            {/* DIVIDER */}
            <div className="w-px h-6 bg-slate-200 hidden md:block mx-1"></div>

            {/* USER BUTTON */}
            {isLoggedIn ? (
              <div className="relative group cursor-pointer z-50">
                <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                    <FaUser size={12} />
                  </div>
                  <span className="hidden lg:block text-sm font-bold text-slate-700 group-hover:text-primary transition-colors max-w-[120px] truncate">
                    {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || "Tài khoản"}
                  </span>
                </div>
                {/* DROPDOWN */}
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top translate-y-2 group-hover:translate-y-0">
                  <div className="p-2 space-y-1">
                    <Link to="/profile" className="block w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors">Tài khoản của tôi</Link>
                    <Link to="/profile?tab=wallet" className="block w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors">Ví SNEAKERHOUSE</Link>
                    <div onClick={goOrders} className="block w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors cursor-pointer">Lịch sử đơn hàng</div>
                    {user?.isAdmin && (
                      <Link to="/admin" className="block w-full text-left px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors">Quản trị viên (Admin)</Link>
                    )}
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">Đăng xuất</button>
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={goLogin} className="flex items-center gap-2 cursor-pointer ml-1">
                <div className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-primary transition-colors shadow-md hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2">
                  <FaUser size={14} /> <span className="hidden md:inline">Đăng nhập</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM NAV LINKS */}
        <div className="container mx-auto px-4 max-w-7xl mt-4 hidden md:block">
          <ul className="flex items-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap overflow-x-auto no-scrollbar pb-1">
            <li><Link to="/" className="text-slate-900 hover:text-primary transition-colors">Trang chủ</Link></li>
            <li><Link to="/product" className="hover:text-primary transition-colors">Tất cả sản phẩm</Link></li>
            <li><Link to="/product?category=phu-kien" className="hover:text-primary transition-colors">Phụ kiện</Link></li>
            <li><Link to="/voucher" className="hover:text-primary transition-colors">Voucher</Link></li>
            <li>
              <Link to="/sale" className="text-secondary hover:text-pink-600 transition-colors cursor-pointer flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                Sale up to 50%
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
