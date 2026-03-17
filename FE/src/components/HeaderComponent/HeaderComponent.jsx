import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { clearUser } from "../../redux/user";
import Swal from "sweetalert2";

const HeaderComponent = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const cartItems = useSelector((state) => state.cart?.items || []);
  const cartCount = cartItems.reduce((sum, item) => sum + (item.qty || 1), 0);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    const result = await Swal.fire({
      title: "Đăng xuất?",
      text: "Bạn có chắc muốn đăng xuất khỏi tài khoản?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f49d25",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Đăng xuất",
      cancelButtonText: "Hủy",
    });
    if (result.isConfirmed) {
      dispatch(clearUser());
      navigate("/");
    }
  };

  const isLoggedIn = user?.login;
  const isAdmin = user?.isAdmin;

  // Avatar: ảnh hoặc chữ cái đầu
  const AvatarOrInitial = () => {
    if (user?.avatar) {
      return (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <span className="text-sm font-bold text-primary">
        {user?.name?.charAt(0)?.toUpperCase() || "U"}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-6 lg:px-20 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Logo + Nav */}
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-1 rounded">
              <span className="material-symbols-outlined text-background-dark">
                vertical_split
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">SNEAKERHOUSE</h2>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/product/new"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              New Arrivals
            </Link>
            <Link
              to="/product"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Shop
            </Link>
            <Link
              to="/category"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Collections
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              About
            </Link>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex flex-1 justify-end items-center gap-4">
          {/* Search bar (desktop) */}
          <div className="relative hidden lg:block w-full max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm giày..."
              className="w-full bg-primary/5 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Cart */}
          <Link
            to="/cart"
            className="p-2 hover:bg-primary/10 rounded-full transition-colors relative"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-[10px] font-bold text-white w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* ── User Section ─────────────────────────────── */}
          {isLoggedIn ? (
            /* Avatar + Dropdown khi đã đăng nhập */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 group"
                aria-label="Tài khoản"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden border-2 border-primary/30 flex items-center justify-center hover:border-primary transition-colors">
                  <AvatarOrInitial />
                </div>
                <span className="hidden sm:block text-sm font-semibold max-w-[100px] truncate">
                  {user.name?.split(" ").pop()}
                </span>
                <span
                  className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                >
                  expand_more
                </span>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+12px)] w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-primary/10 overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {user.email}
                    </p>
                    {isAdmin && (
                      <span className="inline-block mt-1 text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        person
                      </span>
                      Tài khoản của tôi
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        package_2
                      </span>
                      Đơn hàng của tôi
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        favorite
                      </span>
                      Danh sách yêu thích
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          admin_panel_settings
                        </span>
                        Quản trị hệ thống
                      </Link>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 dark:border-slate-800 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        logout
                      </span>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Nút đăng nhập khi chưa đăng nhập */
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  login
                </span>
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-background-dark text-sm font-bold rounded-full hover:bg-primary/90 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">
                  person_add
                </span>
                <span className="hidden sm:inline">Đăng ký</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 hover:bg-primary/10 rounded-full transition-colors lg:hidden"
            aria-label="Menu"
          >
            <span className="material-symbols-outlined">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {menuOpen && (
        <div className="lg:hidden mt-4 pb-4 border-t border-primary/10 pt-4 space-y-1">
          <Link
            to="/product/new"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
          >
            New Arrivals
          </Link>
          <Link
            to="/product"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
          >
            Shop
          </Link>
          <Link
            to="/category"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
          >
            Collections
          </Link>
          {!isLoggedIn && (
            <div className="flex gap-2 pt-2 px-4">
              <Link
                to="/login"
                className="flex-1 text-center py-2.5 text-sm font-semibold border border-primary rounded-xl hover:bg-primary/5 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2.5 text-sm font-bold bg-primary text-background-dark rounded-xl hover:bg-primary/90 transition-all"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default HeaderComponent;
