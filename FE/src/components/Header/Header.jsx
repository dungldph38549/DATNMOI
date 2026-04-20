import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUser, FaHeart, FaShoppingCart, FaSearch, FaChevronDown } from "react-icons/fa";

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed w-full top-0 z-50 flex flex-col transition-all duration-300">
      {/* TOP BAR */}
      <div className={`bg-slate-900 text-slate-300 text-xs py-2 px-4 transition-all duration-300 ${isScrolled ? 'h-0 py-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
        <div className="container mx-auto flex justify-between items-center max-w-7xl">
          <div className="flex gap-4 font-medium tracking-wide">
            <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">VND <FaChevronDown size={10} /></span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">Tiếng Việt <FaChevronDown size={10} /></span>
          </div>
          <div className="hidden md:flex gap-6 font-medium">
            <Link to="/profile" className="hover:text-primary transition-colors flex items-center gap-2"><FaUser size={10} /> Tài khoản</Link>
            <Link to="/wishlist" className="hover:text-secondary transition-colors flex items-center gap-2"><FaHeart size={10} /> Yêu thích</Link>
            <Link to="/checkout" className="hover:text-primary transition-colors flex items-center gap-2">Thanh toán</Link>
            <Link to="/login" className="text-white font-bold bg-white/10 px-3 py-1 rounded-full hover:bg-white/20 transition-all">Đăng nhập</Link>
          </div>
        </div>
      </div>

      {/* MAIN HEADER */}
      <div className={`bg-white/80 backdrop-blur-xl border-b border-gray-100 transition-all duration-300 ${isScrolled ? 'shadow-glass py-2' : 'py-4'}`}>
        <div className="container mx-auto px-4 max-w-7xl flex flex-wrap items-center justify-between gap-6">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
              F
            </div>
            <h1 className="text-2xl font-display font-black tracking-tight text-slate-800">
              Flip<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">mart</span>
            </h1>
          </Link>

          {/* SEARCH BAR */}
          <div className="flex-1 max-w-2xl hidden md:flex items-center bg-slate-100/80 rounded-full border border-transparent focus-within:border-primary/30 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-primary/5 transition-all duration-300 overflow-hidden group">
            <div className="px-4 py-3 text-sm font-semibold text-slate-600 border-r border-slate-200 cursor-pointer hover:text-primary flex items-center gap-2">
              Danh mục <FaChevronDown size={10} />
            </div>
            <input
              type="text"
              placeholder="Bạn muốn tìm gì hôm nay?"
              className="flex-1 bg-transparent px-5 py-3 outline-none text-slate-700 text-sm font-medium placeholder-slate-400"
            />
            <button className="px-6 py-3 text-slate-400 group-focus-within:text-primary hover:text-secondary transition-colors">
              <FaSearch size={18} />
            </button>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-4">
            <Link to="/cart" className="flex items-center gap-3 cursor-pointer group">
              <div className="relative p-3 rounded-2xl bg-slate-50 group-hover:bg-primary/10 transition-colors">
                <FaShoppingCart className="text-slate-700 group-hover:text-primary transition-colors" size={20} />
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-secondary to-pink-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-md animate-bounce">2</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giỏ hàng</p>
                <p className="text-sm font-black text-slate-800 group-hover:text-primary transition-colors">600.000₫</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={`bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300 ${isScrolled ? 'hidden' : 'block'}`}>
        <div className="container mx-auto px-4 max-w-7xl overflow-x-auto no-scrollbar">
          <ul className="flex items-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">
            <li><Link to="/" className="block py-4 text-primary relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary">TRANG CHỦ</Link></li>
            <li><Link to="/category" className="block py-4 hover:text-primary transition-colors relative group">QUẦN ÁO<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span></Link></li>
            <li>
              <Link to="/category" className="block py-4 hover:text-primary transition-colors relative group">
                <span className="flex items-center gap-1">ĐIỆN TỬ <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">HOT</span></span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
              </Link>
            </li>
            <li><Link to="/category" className="block py-4 hover:text-primary transition-colors relative group">SỨC KHỎE & LÀM ĐẸP<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span></Link></li>
            <li><Link to="/category" className="block py-4 hover:text-primary transition-colors relative group">ĐỒNG HỒ<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span></Link></li>
            <li><Link to="/category" className="block py-4 text-secondary hover:text-pink-600 transition-colors drop-shadow-sm">KHUYẾN MÃI HÔM NAY</Link></li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

export default Header;