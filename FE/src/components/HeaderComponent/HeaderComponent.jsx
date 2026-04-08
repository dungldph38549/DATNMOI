import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaShoppingCart,
  FaSearch,
  FaUser,
  FaHeart,
  FaGift,
} from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { clearUser } from "../../redux/user";
import notify from "../../utils/notify";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart.items || []);
  const wishlist = useSelector((state) => state.wishlist.items || []);
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && user?.token);
  const cartLineCount = isLoggedIn ? cart.length : 0;

  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    setKeyword("");
  }, [location.pathname]);

  const goHome = () => navigate("/");

  const goCart = () => {
    if (!isLoggedIn) {
      notify.warning("Vui lòng đăng nhập để xem giỏ hàng.");
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    navigate("/cart");
  };

  const goOrders = () => {
    if (!isLoggedIn) {
      notify.warning("Vui lòng đăng nhập để xem đơn hàng.");
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
    navigate(`/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  const navLinkClass =
    "text-xs md:text-sm font-bold tracking-wide text-neutral-900 hover:text-convot-sage transition-colors";

  const subLinkClass = "text-xs text-neutral-500 hover:text-convot-sage transition-colors";

  const searchParams = new URLSearchParams(location.search);
  const categoryQs = (searchParams.get("category") || "").toLowerCase();
  const navActive = (active) =>
    `${navLinkClass}${active ? " underline decoration-2 underline-offset-8" : ""}`;

  const isProductsNav =
    location.pathname === "/product" && categoryQs !== "phu-kien";
  const isAccessoriesNav = location.pathname === "/phu-kien";
  const isSaleNav = location.pathname === "/sale";
  const isVoucherNav = location.pathname === "/voucher";

  const mainNav = (
    <>
      <Link to="/product?segment=products" className={navActive(isProductsNav)}>
        SẢN PHẨM
      </Link>
      <Link to="/phu-kien" className={navActive(isAccessoriesNav)}>
        PHỤ KIỆN
      </Link>
      <Link to="/sale" className={navActive(isSaleNav)}>
        SALE
      </Link>
      <Link to="/voucher" className={navActive(isVoucherNav)}>
        VOUCHER
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 w-full z-50 font-body bg-[#f7f6f3] border-b border-neutral-200/80">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 md:py-4">
          <div onClick={goHome} className="flex items-center cursor-pointer shrink-0 order-1">
            <span className="text-lg md:text-xl xl:text-2xl font-display tracking-tight">
              <span className="font-black text-neutral-900">SNEAKER</span>
              <span className="font-semibold text-convot-sage">HOUSE</span>
            </span>
          </div>

          <nav className="hidden lg:flex flex-1 justify-center items-center gap-8 xl:gap-10 order-3 lg:order-2 w-full lg:w-auto">
            {mainNav}
          </nav>

          <div className="flex items-center gap-2 md:gap-3 order-2 lg:order-3 flex-1 lg:flex-initial justify-end min-w-0">
            <form
              onSubmit={handleSearch}
              className="hidden sm:flex flex-1 max-w-[220px] lg:max-w-[260px] items-center rounded-full border border-neutral-200 bg-white px-3 py-2 shadow-sm focus-within:border-convot-sage/50 focus-within:ring-1 focus-within:ring-convot-sage/15 transition-all"
            >
              <FaSearch className="text-neutral-400 shrink-0" size={14} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm kiếm..."
                className="flex-1 min-w-0 bg-transparent ml-2 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none"
              />
            </form>

            <Link
              to="/search"
              className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 hover:bg-white/80 transition-colors"
              aria-label="Tìm kiếm"
            >
              <FaSearch size={18} />
            </Link>

            <Link
              to="/wishlist"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 hover:bg-white/80 transition-colors"
              aria-label="Yêu thích"
            >
              <FaHeart size={18} />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-0.5 bg-convot-sage text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length > 9 ? "9+" : wishlist.length}
                </span>
              )}
            </Link>

            <div
              onClick={goOrders}
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 hover:bg-white/80 transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && goOrders()}
              aria-label="Đơn hàng"
            >
              <FaGift size={18} />
            </div>

            <div
              onClick={goCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 hover:bg-white/80 transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && goCart()}
              aria-label="Giỏ hàng"
            >
              <FaShoppingCart size={18} />
              {cartLineCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-0.5 bg-convot-sage text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartLineCount > 9 ? "9+" : cartLineCount}
                </span>
              )}
            </div>

            {isLoggedIn ? (
              <div className="relative group cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-800 hover:border-convot-sage/50 transition-colors">
                  <FaUser size={14} />
                </div>
                <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-neutral-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="p-2 space-y-0.5">
                    <p className="px-3 py-2 text-xs font-semibold text-neutral-400 truncate border-b border-neutral-100">
                      {user?.name || user?.email}
                    </p>
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 rounded-lg"
                    >
                      Tài khoản
                    </Link>
                    <Link
                      to="/profile?tab=wallet"
                      className="block px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 rounded-lg"
                    >
                      Ví
                    </Link>
                    <div
                      onClick={goOrders}
                      className="block px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 rounded-lg cursor-pointer"
                    >
                      Đơn hàng
                    </div>
                    {user?.isAdmin && (
                      <Link
                        to="/admin"
                        className="block px-3 py-2 text-sm font-medium text-convot-sage hover:bg-neutral-50 rounded-lg"
                      >
                        Quản trị
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={goLogin}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-800 hover:border-convot-sage transition-colors"
                aria-label="Đăng nhập"
              >
                <FaUser size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-4 overflow-x-auto no-scrollbar pb-3 border-t border-neutral-200/60 pt-3">
          <Link to="/product?segment=products" className={`${navActive(isProductsNav)} whitespace-nowrap`}>
            SẢN PHẨM
          </Link>
          <Link to="/phu-kien" className={`${navActive(isAccessoriesNav)} whitespace-nowrap`}>
            PHỤ KIỆN
          </Link>
          <Link to="/sale" className={`${navActive(isSaleNav)} whitespace-nowrap`}>
            SALE
          </Link>
          <Link to="/voucher" className={`${navActive(isVoucherNav)} whitespace-nowrap`}>
            VOUCHER
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pb-3 pt-2 border-t border-neutral-200/50">
          <Link to="/" className={subLinkClass}>
            Trang chủ
          </Link>
          <Link to="/terms" className={subLinkClass}>
            Điều khoản &amp; điều kiện
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
