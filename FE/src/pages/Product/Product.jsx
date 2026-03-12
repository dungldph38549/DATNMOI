import React, { useState } from "react";

/* ================= DATA ================= */
const productsData = [
  {
    id: 1,
    name: "Air Max Velocity",
    brand: "Nike • Running",
    price: 145,
    image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb",
  },
  {
    id: 2,
    name: "Classic Fusion",
    brand: "Adidas • Lifestyle",
    price: 95,
    image: "https://images.unsplash.com/photo-1588361861040-ac9b1018f6d5",
  },
  {
    id: 3,
    name: "Cloud Stratus 3",
    brand: "On Running • Pro",
    price: 160,
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5",
  },
  {
    id: 4,
    name: "Retro Lo-Top",
    brand: "Puma • Heritage",
    price: 75,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77",
  },
];

/* ================= COMPONENT ================= */

const ProductCard = ({ product }) => {
  return (
    <div className="flex flex-col gap-2 group">
      <div className="relative w-full aspect-[4/5] bg-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div
          className="w-full h-full bg-center bg-cover transition-transform group-hover:scale-105"
          style={{ backgroundImage: `url(${product.image})` }}
        />
      </div>

      <div className="px-1 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-bold">{product.name}</h3>
          <p className="text-xs text-slate-500">{product.brand}</p>
          <p className="text-primary font-bold mt-1">
            ${product.price.toFixed(2)}
          </p>
        </div>

        <button className="bg-primary/10 text-primary p-2 rounded-lg hover:bg-primary hover:text-white transition-colors">
          +
        </button>
      </div>
    </div>
  );
};

/* ================= PAGE ================= */

const ShopPage = () => {
  const [search, setSearch] = useState("");

  const filteredProducts = productsData.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative flex min-h-screen flex-col max-w-md mx-auto bg-white shadow-xl">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-white px-4 py-4 flex items-center justify-between border-b">
        <h1 className="text-lg font-bold text-center flex-1">Premium Kicks</h1>
      </header>

      {/* SEARCH */}
      <div className="px-4 py-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 px-4 bg-slate-100 rounded-xl focus:ring-2 focus:ring-orange-400"
          placeholder="Tìm kiếm giày..."
        />
      </div>

      {/* PRODUCT GRID */}
      <main className="grid grid-cols-2 gap-4 p-4 mb-20">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <p className="col-span-2 text-center text-slate-400">
            Không tìm thấy sản phẩm
          </p>
        )}
      </main>
    </div>
  );
};

export default ShopPage;
