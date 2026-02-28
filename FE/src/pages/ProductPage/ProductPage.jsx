import React, { useState } from "react";
import { Link } from "react-router-dom";

const products = [
  {
    id: 1,
    brand: "Nike",
    name: "Air Zoom Pegasus 38",
    price: 120,
    badge: "Trending",
    badgeBg: "primary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDrTATP0em5NbeY5EVQ2beyoq_m3H0BMbXX3WVVMtk5ukaTo_2OCZ9YD-53sPyrTlrGWZd19jMUSmiYKlKSYiNbPl4czJR_Bh6jzdv8zZDZeShhqMDfRkCydJyjavEeGwX7bs2n9vQwDe9K0RGRDHI4AVxCqJO6DNJTJQGwCWGYfagQYIribGqYKzA4HWNdreJGyrmbEaO3zWzylE41EEgloFyd1mteqiaW_i4s0Shyz4EKAZNPxXoqBFvN8WzvW9SBnOFkxUWTAiY",
    alt: "Red Nike running sneaker on white background",
  },
  {
    id: 2,
    brand: "Adidas",
    name: "Stan Smith Originals",
    price: 95,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBtXm0eNrrJzE3mhWsuTAtYGRNO6dvusW9exfhs-HToXY2DSTA8cPYumLPbA_msqHZNNsSie6aFr_h9YcZjbGXQRsHJWj7hWYTKboaahmYX4lWbbQukTQvUPMJkHzL5RR-vAHwRLH1m8GJcr27TnjIloCJFifDsqHYijFBSesNPgQvxL3x3cVOWfSqt21z6PDP25CSvWjfSi6aZU3kSv16cLZzuj-uICblN17gCmSyLO2ab-0J5KkoC3oTGjdSTzlJkF-7YcnwWkEo",
    alt: "Classic white and green Adidas Stan Smith sneakers",
  },
  {
    id: 3,
    brand: "New Balance",
    name: "574 Core",
    price: 80,
    originalPrice: 100,
    badge: "Sale -20%",
    badgeBg: "slate-900",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA18oCWdAvmTioNJogVcy7NlxsZs63lHYnQeau29FR9OO5XypozK_aOgiIo0DaOWF6BNX5VuRT5u3VNv1cPilMfcfZufoNg80d5uR2PpemgxW8XcPTMTml9rcl-wNcGCjNySfQOmlsQgolNq_wmssoopOX_LgVpP6eExbd8KzCDwVq27VX4JCtSVd52EA_9pWLgLJPljtQ30KgLruwQ77YBz2f-v1ZRFnOflEPih4S9Jnl7WOnjotBxHTkpV_2RDoneiVtdOOg7szc",
    alt: "Brown lifestyle sneaker with sleek design",
  },
  {
    id: 4,
    brand: "Nike",
    name: "React Vision",
    price: 145,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBU6MoD7IS1V-V1W-a7G_4eCm74-bxIWFMGfjBLbb55FHIvoNtFYbiuon_vHTeZ56FyOSUvXxwpC3H3T92BwccuPkVXpGu5s5oZ-o-voFum0G2sw0T6AZMpMfq3nVMo4ldLjO9OeT3heL3UWhTyRQTnL9uYBkcXsNBdFFairgOj2mmeHyV7C83s7a9GXEnmiidUDJBpm1TobBXeMTdSeOAsjN9t2Iy7LikuJBBtyPk-0avS3o44bKklZOCYQxWW125NnBAF6ngVR58",
    alt: "Vibrant neon green Nike sports shoes",
  },
  {
    id: 5,
    brand: "Puma",
    name: "RS-X³ Puzzle",
    price: 110,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBcAqN6TpkdfkagbKgdg-8NU0uUB_hJaI3HSwanCBMN629YMdC8rfDN-BApSZFgCIzUN2ukJHtx8KOxjz2AR7WCGHQScXmu_YiwCvrJ35SYFtm7NcdlG7tWoYkIvJ0uUMhoZzv0OkYwcQuyQXfxbusY_dBu4lpRjO7OtQn0lSiQSdSZmoqoir4kOc5GpO5xGdaCVTqh3nIqHV5C2Kt6cpVKcakW-N_EmgtV9sqTA2rfcCUWlTwqmyKRvnHjahtPlV7Cdy6yyrC3oJA",
    alt: "Light gray and white athletic sneakers",
  },
  {
    id: 6,
    brand: "Nike",
    name: "Air Max 270",
    price: 160,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCDhDm22kItL1ZMrQTjS8gGX9cCu3dfkuXqzXZNKlHl1svsF8JzZtipwpQNifcB3kdOV-2G-bdKepIjmQZ6t0GBnR3taZ2xibERJe8U4ttoYOtebURGC8uD7qOOvHCe03Cj9R7jZV6pK9fbV2l-xtpEvlYWwi_BCipO5icTLKuT7o1zbTuVYzlWv4Y52-5RCHvbwydZSJbY5oOrOseFEGqarDmzaXEBSgzkJ9sYhlWNj16UQ2oP3QgBhSB5sN0b9Gl5aq6yHkICQVU",
    alt: "Stylish dark Nike air sneakers",
  },
];

const ProductPage = () => {
  const [selectedSize, setSelectedSize] = useState(9);
  const [page, setPage] = useState(1);

  return (
    <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 font-display">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-slate-500">
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          Sneakers
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="sticky top-28 space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  filter_list
                </span>
                Filters
              </h3>
              <div className="space-y-6">
                {/* Brand */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                    Brand
                  </h4>
                  <div className="space-y-2">
                    {["Nike", "Adidas", "New Balance", "Puma"].map((brand) => (
                      <label
                        key={brand}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={brand === "Nike"}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm group-hover:text-primary">
                          {brand}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                    Price Range
                  </h4>
                  <input
                    type="range"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2 text-xs font-medium">
                    <span>$0</span>
                    <span>$500+</span>
                  </div>
                </div>

                {/* Size */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                    Size (US)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 8, 9, 10, 11, 12].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`py-2 text-sm border rounded transition-colors ${
                          selectedSize === size
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                    Colors
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="size-8 rounded-full bg-black ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                    />
                    <button
                      type="button"
                      className="size-8 rounded-full bg-white border border-slate-200 ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                    />
                    <button
                      type="button"
                      className="size-8 rounded-full bg-primary ring-2 ring-offset-2 ring-primary"
                    />
                    <button
                      type="button"
                      className="size-8 rounded-full bg-blue-500 ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                    />
                    <button
                      type="button"
                      className="size-8 rounded-full bg-red-500 ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Men&apos;s Sneakers</h1>
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500">
                Showing 1-12 of 84 results
              </p>
              <select className="text-sm border-slate-200 rounded-full bg-white dark:bg-slate-800 py-2 pl-4 pr-10 focus:ring-primary focus:border-primary">
                <option>Sort by: Popularity</option>
                <option>Sort by: Newest</option>
                <option>Sort by: Price Low to High</option>
                <option>Sort by: Price High to Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="group relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-800"
              >
                <div className="aspect-square overflow-hidden bg-slate-100 relative">
                  <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    src={product.image}
                    alt={product.alt}
                  />
                  <button
                    type="button"
                    className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">
                      favorite
                    </span>
                  </button>
                  {product.badge && (
                    <div className="absolute top-4 left-4">
                      <span
                        className={`${
                          product.badgeBg === "primary"
                            ? "bg-primary"
                            : "bg-slate-900"
                        } text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest`}
                      >
                        {product.badge}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                    {product.brand}
                  </p>
                  <h3 className="font-bold text-lg mb-2 truncate">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-primary">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-slate-400 line-through">
                          ${product.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">
                        add_shopping_cart
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-2">
              <button
                type="button"
                className="size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => setPage(1)}
                className={`size-10 flex items-center justify-center rounded-lg font-bold ${
                  page === 1 ? "bg-primary text-white" : "border border-slate-200 hover:bg-slate-100"
                }`}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => setPage(2)}
                className={`size-10 flex items-center justify-center rounded-lg ${
                  page === 2 ? "bg-primary text-white" : "border border-slate-200 hover:bg-slate-100"
                }`}
              >
                2
              </button>
              <button
                type="button"
                onClick={() => setPage(3)}
                className={`size-10 flex items-center justify-center rounded-lg ${
                  page === 3 ? "bg-primary text-white" : "border border-slate-200 hover:bg-slate-100"
                }`}
              >
                3
              </button>
              <span className="px-2">...</span>
              <button
                type="button"
                className="size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100"
              >
                8
              </button>
              <button
                type="button"
                className="size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProductPage;
