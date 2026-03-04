import React from "react";

const ProductDetail = () => {
  return (
    <main className="flex-1 w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="w-full px-6 lg:px-20 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <a className="hover:text-primary" href="#">
            Home
          </a>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <a className="hover:text-primary" href="#">
            Footwear
          </a>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="text-slate-900 dark:text-slate-100 font-medium">
            Air Max Pulse
          </span>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Product Images */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <img
                  alt="Main Product View"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmtSm_fvtOM71wRKTcwP4y89rrZz63IiuB_uoXlVhpK6yCD8Zieticm4IaC2ALWSYyuMamm4OdvmKpnWtVciryGrtZIgXyCIDyUOASyHFbP6pJrBrcnU9XDtmXbwz2lxQWbh42SO9m8CV07oECg4xfIMSzh8vZkV7j_Z3ObgqSdbxp_f-XvJ9tFcjIDuXUXMvfvpzWqKHf8CJQg0c1dXvLliDYWaemFb0GwWJD6zX7x3qXqoD7vd7xQNWKclf9egcmnhG0ZH8ZKcQ"
                />
              </div>
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <img
                  alt="Detail View 1"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgzoIqBKoYKZTb3IH3edF8VjMXFVidLcN5bJIVd4vJMg9wgwjJxOy8r5ptlt1h8Hu_CUFkQMnECYriQd7rao44LVFjE8NkwbOlBGq6eEeBaLoC20Cw8-mtSHMcdxipc_xCd0ka5enlbi6UIzxjZY5RN0LkHoyxSn5R29I1-pGnO4Iw5rjb8GhEyHK-W5OCp8lUHpUGgc3_uREv3dnYeP8w7ygAtqFV9PK0pt9JGrjDa395499q2wz2eYnbrdz94viuNSm0n9vsoXo"
                />
              </div>
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <img
                  alt="Detail View 2"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJI0qBdg1loGlajaXSpt7PCj4tz6_Y3F9eICJAUtab46j4P9r2kl5X4PdIn2Y2JisdWA0NBkmIXX3SSWe4STP4HcpJrGAj5GjXizvyoxjojmzMG-cIsXSgDmRDLJH5bDJnemOTU3WFWkn7x0pb3q-nLu-OWsq56_KtmvY5W5Iw6_0uo4xQKDEOLuisHnv0bCTDPnkcyipg-wlVbvIywxMSC6s9f6_sWvFI0qsu8C1EyoUROHcHYEBiCFKHN0O_opx4I4Q_DDGhDP0"
                />
              </div>
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <img
                  alt="Detail View 3"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAimKqdx_sLWZyXBqtDUQgMxfbDC9PulDKAojsY7xP4NyLTWzt1CIosTg1wCjmQliQ8Iebl1FhCtRgQLdiAMo92hbX4I3TVfUAJvVd0E92oFlvnALwx9nt29pZRhcggPhqcW9-6OzR8xgbAanMx9WvnZeKZ7I5b6Nlk9G0YhCo9Yv0GWvjMaPmplrgKQJN-ot7yElXSXA1Mf2KhLWd9pkAFOyparEwagSrun1MM8uku-Ny1B_fGOJta4sy1oJGFXstvK1fwprfRCVg"
                />
              </div>
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <img
                  alt="Detail View 4"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFhYh7-GBobv13ODXz7WLdKXin_uCTbztEj1SM1GDw5Txekl560tqmoZipKxNWOmh3xH2s0qy8RHxsCbL8q6Nyr2-s_ZjhKZ6hNjSd8EbVjbcuuld8dRdDdiBoCeO8dOKTHqmPUHjRZaSV3ZptKLXZFHQ3aZPzcaXNkrV83VAcYKPsUKzeDvXvMA9FuQ498RXEjtJDpOXNU4li9tqXU93crzEhpvRzvdraG7gJtYqDqwRfYAJ0ZpU2aZVZwAtFoFeqYCvB6LD-3gU"
                />
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <span className="text-sm tracking-widest uppercase">
                  New Release
                </span>
              </div>
              <h2 className="text-4xl font-black tracking-tight mb-2">
                Air Max Pulse
              </h2>
              <p className="text-lg text-slate-500">
                Men&apos;s Road Running Shoes
              </p>
              <p className="text-2xl font-bold mt-4">$150.00</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex text-primary">
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined fill-1">star</span>
                <span className="material-symbols-outlined">star_half</span>
              </div>
              <span className="text-sm font-semibold border-b border-slate-300">
                124 Reviews
              </span>
            </div>

            {/* Colorway */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Select Colorway</h3>
                <span className="text-sm text-slate-500">Orange / Black</span>
              </div>
              <div className="flex gap-3">
                <button className="w-16 h-16 rounded-lg border-2 border-primary overflow-hidden">
                  <img
                    alt="Color 1"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYrZ5_JGV6MKBAxI0TUXdZ9ypFZtEjZ4pp-5CYUCfY67leIN8HVfj7_pQPCsN-9Hybb2DxqL4Ro0xTzDTa7N4vU8AM4dhHp-EikHzm0cxG30JwwjFxHxOadbNOuJ_9GJGfgezWybvUiQKqa_Fnw3dYQuLXWHH4mnYeOxdo-r3GwNMUcXPft4_7U2Hi1z2ZE2eZlR0U_cPQdd_C2fghol66HWDieuUT4Lv801A8mkuDlNKCVQPOoYKlTt6HI5azkl9bmLqbRdJs8VI"
                  />
                </button>
                <button className="w-16 h-16 rounded-lg border-2 border-transparent hover:border-slate-300 overflow-hidden">
                  <img
                    alt="Color 2"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFf_C7KzfZAjw0Z4xHIrjyU8-n9Kpnf-F_9u8GVQaFUTxvIgR2Pcsehm2-0fdDcccQ9datJDMcqCGMokrn2QCnV-CEM2izU6nuP2CiKkVCc8l6vvrb4RHkkO5CWJ-Vj74W2W8va0ubhW3qBw175P3h6adnu0aaumy61oqh9Cg4ZyoB9K4Vp51Zdjg7UFtA-RJzA8i2MDaK2Lj2gaUxNMMT-rWETe0uUMAlgUhp9S80HJHvPiw9DJcEWzxUoVAm4nmZqugCi9U06gM"
                  />
                </button>
                <button className="w-16 h-16 rounded-lg border-2 border-transparent hover:border-slate-300 overflow-hidden">
                  <img
                    alt="Color 3"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDS-xL5mqkhJVyv9PyS4fDUO1CvLXeXE76vyurcFWgIvCCYF1Xe-ORHDq8AQ4MBOFtKhQKDyWmtuw3AE0exQsPlcQ0O4c2xHj7z1YJsdBjMnZxztrVKEzcJU-xr6bPEKDj7n3XUXNYbPaddIwjRqUnhKHImrUWcEEfDmmtjSb788gqGHND39eYOxjHG9LR1BTQV4kuDV2hqWM5C-w-v3q78MLWACaL3nSYZirZnUxXkkgYr9n5ZOJnQjm1BDjfI7hacRforvlH6sJs"
                  />
                </button>
              </div>
            </div>

            {/* Size */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Select Size</h3>
                <a
                  className="text-sm text-slate-500 hover:text-primary underline"
                  href="#"
                >
                  Size Guide
                </a>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button className="py-3 border border-slate-200 dark:border-slate-700 rounded hover:border-primary hover:bg-primary/5 transition-all">
                  US 7
                </button>
                <button className="py-3 border border-slate-200 dark:border-slate-700 rounded hover:border-primary hover:bg-primary/5 transition-all">
                  US 8
                </button>
                <button className="py-3 border border-primary bg-primary/10 rounded font-bold">
                  US 9
                </button>
                <button className="py-3 border border-slate-200 dark:border-slate-700 rounded hover:border-primary hover:bg-primary/5 transition-all">
                  US 10
                </button>
                <button className="py-3 border border-slate-200 dark:border-slate-700 rounded hover:border-primary hover:bg-primary/5 transition-all">
                  US 11
                </button>
                <button className="py-3 border border-slate-200 dark:border-slate-700 rounded hover:border-primary hover:bg-primary/5 transition-all text-slate-300 cursor-not-allowed">
                  US 12
                </button>
                <button className="py-3 border border-slate-200 dark:border-slate-700 rounded hover:border-primary hover:bg-primary/5 transition-all">
                  US 13
                </button>
                <button className="py-3 border border-slate-200 dark:border-slate-700 rounded hover:border-primary hover:bg-primary/5 transition-all">
                  US 14
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 transition-all">
                Add to Cart
              </button>
              <button className="w-full py-5 border-2 border-slate-200 dark:border-slate-700 hover:border-primary rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all">
                <span className="material-symbols-outlined">favorite</span>
                Favorite
              </button>
            </div>

            {/* Shipping Info */}
            <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-4">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-primary">
                  local_shipping
                </span>
                <div>
                  <p className="font-bold text-sm">Free Delivery</p>
                  <p className="text-xs text-slate-500">Orders over $100</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-primary">
                  keyboard_return
                </span>
                <div>
                  <p className="font-bold text-sm">30-Day Returns</p>
                  <p className="text-xs text-slate-500">No questions asked</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Information & Reviews */}
        <section className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-16 py-16 border-t border-slate-200 dark:border-slate-800">
          {/* Product Information */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Product Information</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Drawing inspiration from the rhythm of the city, the Air Max Pulse
              brings an underground touch to the iconic Air Max line. Its
              textile-wrapped midsole and vacuum-sealed accents keep &apos;em
              looking fresh and clean, while colors inspired by the urban music
              scene give &apos;em an edge.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-sm">
                  check_circle
                </span>
                <span>
                  Point-loaded cushioning system features a plastic clip that
                  distributes weight to targeted points across the Air unit.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-sm">
                  check_circle
                </span>
                <span>
                  Breathable textile upper with leather and synthetic overlays.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-sm">
                  check_circle
                </span>
                <span>Rubber Waffle outsole gives you durable traction.</span>
              </li>
            </ul>
          </div>

          {/* Reviews */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Reviews (124)</h3>
              <button className="text-primary font-bold hover:underline">
                Write a review
              </button>
            </div>

            {/* Rating Summary */}
            <div className="flex items-center gap-8 p-6 bg-white dark:bg-slate-800 rounded-2xl">
              <div className="text-center">
                <p className="text-5xl font-black text-primary">4.8</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
                  Average Rating
                </p>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold w-2">5</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[80%]"></div>
                  </div>
                  <span className="text-xs text-slate-500 w-8">80%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold w-2">4</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[12%]"></div>
                  </div>
                  <span className="text-xs text-slate-500 w-8">12%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold w-2">3</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[5%]"></div>
                  </div>
                  <span className="text-xs text-slate-500 w-8">5%</span>
                </div>
              </div>
            </div>

            {/* Individual Reviews */}
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">Alex Johnson</p>
                    <div className="flex text-primary text-xs scale-90 -ml-1">
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">2 days ago</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Best running shoes I&apos;ve ever owned. The cushioning is
                  revolutionary. Highly recommend for long road runs.
                </p>
              </div>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">Marcus Chen</p>
                    <div className="flex text-primary text-xs scale-90 -ml-1">
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined fill-1">
                        star
                      </span>
                      <span className="material-symbols-outlined">star</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">1 week ago</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Great style and comfort. Fits true to size. Delivery was very
                  fast.
                </p>
              </div>
              <button className="w-full py-4 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                View All Reviews
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProductDetail;
