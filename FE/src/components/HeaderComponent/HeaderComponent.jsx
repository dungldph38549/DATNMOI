import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const HeaderComponent = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const keyword = search.trim();
    if (keyword) {
      navigate(`/category?keyword=${encodeURIComponent(keyword)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-6 lg:px-20 py-4">
      <div className="w-full px-6 lg:px-20 flex items-center justify-between gap-8 font-display">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-1 rounded">
              <span className="material-symbols-outlined text-background-light">
                vertical_split
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">SNEAKERHOUSE</h2>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
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
              to="/collections"
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

        <div className="flex flex-1 justify-end items-center gap-6">
          <form
            onSubmit={handleSearch}
            className="relative hidden lg:block w-full max-w-xs"
          >
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search sneakers..."
              className="w-full bg-primary/5 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors relative">
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className="absolute top-1 right-1 bg-primary text-[10px] font-bold text-white w-4 h-4 flex items-center justify-center rounded-full">
                3
              </span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors lg:hidden">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden sm:block h-10 w-10 rounded-full bg-primary/20 overflow-hidden border-2 border-primary/20">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9DzuLQz6u54X1lGuH_gsmIBF2bnJCCJeoXQu38Jj6br-NispQsAR3n-K1b8U4Hx5XIR3aGPf1Kzm-UD3sKkj6ZCgYjKSEHQt4Uz2gGFBbidWv3ZS7fG-JcHeJ7NkLYBm5AeweoNItTTG95e77-HVQ0kH7XeEMCFFjGLlV9uE-pJN2Xlz2CcVtgLzq4TT9s4obE9E_PRMmBItfwOSYnJMZDYSPM8bE3pc8mEdZnCaUXZor1hTrJ8t_S0KEJ404LbUsC8XzueJVkyw"
                alt="User profile"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderComponent;

