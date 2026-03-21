import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaShoppingCart,
  FaSearch,
  FaUser,
  FaClipboardList,
} from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { clearUser } from "../../redux/user";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart.items || []);
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && user?.token);

  const [keyword, setKeyword] = useState("");
  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);

  /* ================= NAVIGATION ================= */

  const goHome = () => navigate("/");
  const goCart = () => navigate("/cart");
  const goOrders = () => navigate("/orders");
  const goLogin = () => navigate("/login");
  const handleLogout = () => {
    dispatch(clearUser());
    navigate("/", { replace: true });
  };

  /* ================= SEARCH ================= */

  const handleSearch = (e) => {
    e.preventDefault();

    if (keyword.trim() === "") return;

    navigate(`/search?q=${keyword}`);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-[1450px] mx-auto flex items-center justify-between px-12 py-7">
        {/* LOGO */}

        <div
          onClick={goHome}
          className="flex items-center gap-4 cursor-pointer"
        >
          <div className="bg-black text-white px-4 py-2 rounded-xl text-2xl font-bold leading-none">
            EO
          </div>

          <span className="font-bold text-3xl tracking-wide">SNEAKERHOUSE</span>
        </div>

        {/* SEARCH */}

        <form
          onSubmit={handleSearch}
          className="flex items-center bg-gray-100 rounded-full px-7 py-4 w-[640px]"
        >
          <FaSearch className="text-gray-400 mr-3 text-lg" />

          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="bg-transparent outline-none w-full text-base placeholder:text-gray-500"
          />
        </form>

        {/* RIGHT MENU */}

        <div className="flex items-center gap-10 text-xl">
          {/* CART */}

          <div
            onClick={goCart}
            className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
          >
            <FaShoppingCart className="text-3xl" />

            <span>Giỏ hàng</span>

            {cart.length > 0 && (
              <>
                <span className="bg-red-500 text-white text-sm px-2 rounded-full">
                  {cart.length}
                </span>
                <span className="text-sm text-slate-600">
                  ({cartTotal.toLocaleString("vi-VN")}₫)
                </span>
              </>
            )}
          </div>

          {/* ORDERS */}

          <div
            onClick={goOrders}
            className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
          >
            <FaClipboardList className="text-2xl" />

            <span>Đơn hàng</span>
          </div>

          {/* USER */}

          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2"
                title={user?.email}
              >
                <FaUser className="text-2xl" />
                <span>{user?.name || user?.email || "Tài khoản"}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-base px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-100"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div
              onClick={goLogin}
              className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
            >
              <FaUser className="text-2xl" />
              <span>Đăng nhập</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
