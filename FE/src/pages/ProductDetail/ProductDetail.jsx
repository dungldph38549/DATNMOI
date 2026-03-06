import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/product/${id}`);
        const data = await res.json();

        if (data.status !== "OK") {
          throw new Error(data.message || "Không tìm thấy sản phẩm");
        }

        setProduct(data.data);
      } catch (err) {
        setError(err.message || "Có lỗi khi tải chi tiết sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetail();
    }
  }, [id]);
  return (
    <main className="flex-1 w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="max-w-7xl mx-auto px-6 lg:px-20 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link className="hover:text-primary" to="/">
            Home
          </Link>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <Link className="hover:text-primary" to="/product">
            Sneakers
          </Link>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="text-slate-900 dark:text-slate-100 font-medium">
            {product?.name || "Product"}
          </span>
        </nav>

        {loading && (
          <p className="text-sm text-slate-500">Đang tải chi tiết sản phẩm...</p>
        )}

        {error && (
          <p className="text-sm text-red-500 mb-4">Lỗi: {error}</p>
        )}

        {!loading && !error && !product && (
          <p className="text-sm text-slate-500">Không tìm thấy sản phẩm.</p>
        )}

        {/* Product Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                alt={product?.name || "Product image"}
                src={product?.image}
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-primary cursor-pointer">
                <img
                  className="w-full h-full object-cover"
                  alt="Side view of orange sneaker"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9BZ-fJqaLes3cLWcU0PwGZuxA9ObOJ7nVx7dqrzusCfvXKREX_KS2KgEMyyzdC9Aiu8HiAGszphQeUEAU_CXoxksEsxiX6eISQjqtfndtwO4TUv6Bwv_IgYm-1a2ACXSgU7lfs9AaWM-1dDoL9Jj8KsDbe6ccLueP8Inn6Fz-6Er0h5tMHONvFFT0gX_UlpOi3F_FrEHlp7rQxuapwDUX44PA-bSzdO8dm_gg1W9WmRHhbrt8N0FBLDbKB1WDCoKLIfU6iTF6854"
                />
              </div>
              <div className="aspect-square rounded-lg overflow-hidden border border-transparent hover:border-primary/50 cursor-pointer bg-slate-100 dark:bg-slate-800">
                <img
                  className="w-full h-full object-cover"
                  alt="Top view of orange sneaker"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7xK4RrFzve11osM2rabOt0xggfXP4-kINgh9kB90tKzGd2YF7z9EVwaVj1VPN3IcodDeNMriDOGzCqLN1g7dOgLELSk5exIcDvKDVPCstXdbgR5GAoRcNhTbO7KKpfN1piu_Qn6hFLe7bnENgiD_ynWLwG_PLsb_0rneEGmqhCv6AIpePQCvVpBqIel2ag-vWrJFmqSe6D0IHNaoG6fqD6dWHaJ_yq8HJYA7hG8dWp3zvJZect_Bb90I09XokykQU3tFg1v4yUxc"
                />
              </div>
              <div className="aspect-square rounded-lg overflow-hidden border border-transparent hover:border-primary/50 cursor-pointer bg-slate-100 dark:bg-slate-800">
                <img
                  className="w-full h-full object-cover"
                  alt="Detail view of sneaker sole"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAggMZV4BGHJuny0gHDcWEYeA1m8nF5FZ5DxsKQSnanzy-wQy8Oaj-6PuNa-Fso6f-gbvNth8JDrREkimJhvDMxxUP5GCKySyOtX-KLutFu3Hfmje18hYJPXVYNFtDVKyGW3XDvPpvLVcqgHhV97BG_Fbr5YQJ7aj5L1jT2ZOSumh3wYDj5G74zW2Ff0iijf2atzZ8m_hLkSV_00gIJcgPJ39_rUOqJbVis5Ah-8Uw4ayeGsjulrBlE3DIUTJDKHv5lCghVshkhlw"
                />
              </div>
              <div className="aspect-square rounded-lg overflow-hidden border border-transparent hover:border-primary/50 cursor-pointer bg-slate-100 dark:bg-slate-800">
                <img
                  className="w-full h-full object-cover"
                  alt="Back view of sneaker heel"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmdxSlmDz468-W1I43hxefdyg4RANBzDHkvi_ovw5KqAtc7gp2SkzHAc0MLyOBcn40ip7aZV4HhwJXZ52SuafJc28sTC_ZcbCtwZEh-vEBaMOHR5eYlN05ihNTXDOLb57a70ZVldrZlKghB3Ox71He6Y4aK0uiAjR3cu_TobMBkzzgzAZIK54mJ4qDwXB62qmAxs--KnXWYkton8DOHhxgyYiPDlEvwoSz3q_AqffPjSfS58-JrKHVXDUD652_66Ybxf-FsC9Utpc"
                />
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col justify-start">
            <div className="mb-2">
              <span className="text-primary font-bold tracking-widest text-xs uppercase">
                Premium Performance
              </span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
              {product?.name || "Product name"}
            </h1>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center text-primary">
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined">star_half</span>
              </div>
              <span className="text-sm font-medium text-slate-500">
                4.8 (124 Reviews)
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
              {product ? `$${product.price}` : "--"}
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
              {product?.description ||
                "Engineered for both performance running and street-ready style."}
            </p>

            {/* Color Selection */}
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4">
                Select Color
              </h3>
              <div className="flex gap-3">
                <button className="w-12 h-12 rounded-full bg-primary border-4 border-white dark:border-slate-900 shadow-lg ring-2 ring-primary"></button>
                <button className="w-12 h-12 rounded-full bg-slate-900 border-4 border-white dark:border-slate-900 shadow-md"></button>
                <button className="w-12 h-12 rounded-full bg-slate-200 border-4 border-white dark:border-slate-900 shadow-md"></button>
              </div>
            </div>

            {/* Size Selection */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Select Size (US)
                </h3>
                <button className="text-xs font-bold text-primary underline underline-offset-4">
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button className="py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary font-medium text-sm transition-colors">
                  7
                </button>
                <button className="py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary font-medium text-sm transition-colors">
                  8
                </button>
                <button className="py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary font-medium text-sm transition-colors">
                  9
                </button>
                <button className="py-3 rounded-lg border-2 border-primary bg-primary/5 font-bold text-sm">
                  10
                </button>
                <button className="py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary font-medium text-sm transition-colors">
                  11
                </button>
                <button className="py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary font-medium text-sm transition-colors">
                  12
                </button>
                <button className="py-3 rounded-lg border border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed font-medium text-sm">
                  13
                </button>
                <button className="py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary font-medium text-sm transition-colors">
                  14
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <button className="flex-1 bg-primary text-slate-900 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-primary/20">
                <span className="material-symbols-outlined">shopping_bag</span>
                ADD TO CART
              </button>
              <button className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined">favorite</span>
              </button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-xs font-medium text-slate-500 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">
                  local_shipping
                </span>{" "}
                Free Shipping
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">
                  verified_user
                </span>{" "}
                2 Year Warranty
              </div>
            </div>
          </div>
        </div>

        {/* Review Section */}
        <section className="border-t border-slate-200 dark:border-slate-800 pt-16 pb-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-black mb-2">Customer Reviews</h2>
              <p className="text-slate-500">
                Real feedback from our sneaker community.
              </p>
            </div>
            <button className="bg-primary/10 text-primary border-2 border-primary px-8 py-3 rounded-xl font-bold hover:bg-primary hover:text-white transition-all">
              Write a Review
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Ratings Summary */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-primary/5 dark:bg-primary/10 p-8 rounded-3xl border border-primary/10">
                <div className="text-center mb-6">
                  <p className="text-6xl font-black text-primary mb-2">4.8</p>
                  <div className="flex justify-center text-primary mb-2">
                    <span className="material-symbols-outlined fill-1 text-2xl">
                      star
                    </span>
                    <span className="material-symbols-outlined fill-1 text-2xl">
                      star
                    </span>
                    <span className="material-symbols-outlined fill-1 text-2xl">
                      star
                    </span>
                    <span className="material-symbols-outlined fill-1 text-2xl">
                      star
                    </span>
                    <span className="material-symbols-outlined fill-1 text-2xl">
                      star
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    Based on 124 reviews
                  </p>
                </div>
                <div className="space-y-3">
                  {/* 5 Star */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold w-4">5</span>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[85%] rounded-full"></div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium w-8 text-right">
                      85%
                    </span>
                  </div>
                  {/* 4 Star */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold w-4">4</span>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[10%] rounded-full"></div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium w-8 text-right">
                      10%
                    </span>
                  </div>
                  {/* 3 Star */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold w-4">3</span>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[3%] rounded-full"></div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium w-8 text-right">
                      3%
                    </span>
                  </div>
                  {/* 2 Star */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold w-4">2</span>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[2%] rounded-full"></div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium w-8 text-right">
                      2%
                    </span>
                  </div>
                  {/* 1 Star */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold w-4">1</span>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[0%] rounded-full"></div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium w-8 text-right">
                      0%
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                <h4 className="font-bold mb-3">Reviewer Highlights</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-600">
                    &quot;Super Comfortable&quot;
                  </span>
                  <span className="bg-white dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-600">
                    &quot;True to size&quot;
                  </span>
                  <span className="bg-white dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-600">
                    &quot;Fast Shipping&quot;
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Reviews */}
            <div className="lg:col-span-8 space-y-10">
              {/* Review Item 1 */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-primary">
                      JD
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">
                        James D.
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex text-primary text-xs">
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Oct 24, 2023
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-xs">
                      verified
                    </span>{" "}
                    Verified Purchase
                  </span>
                </div>
                <h5 className="font-bold mb-2">
                  Best running shoes I&apos;ve owned!
                </h5>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  The comfort level on these is insane. I&apos;ve been running in
                  them for two weeks now and my feet feel great. Plus, the orange
                  color really pops in person!
                </p>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary">
                    <span className="material-symbols-outlined text-sm">
                      thumb_up
                    </span>{" "}
                    Helpful (12)
                  </button>
                  <button className="text-xs font-bold text-slate-500 hover:text-primary">
                    Report
                  </button>
                </div>
              </div>

              {/* Review Item 2 */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-primary">
                      SL
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">
                        Sarah L.
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex text-primary text-xs">
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined fill-1 text-sm">
                            star
                          </span>
                          <span className="material-symbols-outlined text-sm">
                            star
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Oct 18, 2023
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-xs">
                      verified
                    </span>{" "}
                    Verified Purchase
                  </span>
                </div>
                <h5 className="font-bold mb-2">
                  Great for gym and lifestyle
                </h5>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Love the versatility. I can wear these to my HIIT workout and
                  then straight out for coffee. Only downside is they run a tiny
                  bit narrow, maybe go up half a size if you have wide feet.
                </p>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary">
                    <span className="material-symbols-outlined text-sm">
                      thumb_up
                    </span>{" "}
                    Helpful (5)
                  </button>
                  <button className="text-xs font-bold text-slate-500 hover:text-primary">
                    Report
                  </button>
                </div>
              </div>

              <button className="w-full py-4 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold hover:border-primary/50 transition-colors">
                Load More Reviews
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProductDetail;
