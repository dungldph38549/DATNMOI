import React from "react";

const HomePage = () => {
  return (
    <main className="flex-1 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Hero Section */}
      <section className="px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative min-h-[560px] flex flex-col justify-center overflow-hidden rounded-xl lg:rounded-xl p-8 lg:p-16 bg-slate-900 text-white group">
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-100 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAByHuzHMnvd_c6UEq7pqpzJTrxMD9z9JIJKouQIoyk1cbx4QeiCkydo6hBRKkJ2uVvSAPPQZE1WrOfdK7bcax8dvc7dF6eL27KVHey-a62O58MyxnrSegKcPlEmHfajJLEx0iKCaBMgMDm6NsUosmSS8Z7lb6BfydR3lgLDyS4bedy52vNPI5xI8DLEoYf27buPwELW7luLayp0-PM_eu3fQSq7RObMunX9lLksLPt4e-Qp-mosurWDmmefd3-yozfEQReA-CkQnU"
                alt="Premium orange and black sneakers"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 via-background-dark/40 to-transparent" />
            </div>
            <div className="relative z-10 max-w-xl space-y-6">
              <span className="inline-block px-4 py-1 bg-primary text-background-dark text-xs font-bold uppercase tracking-widest rounded-full">
                Exclusive Drop
              </span>
              <h1 className="text-5xl lg:text-7xl font-black leading-tight">
                Elevate Your Every Step
              </h1>
              <p className="text-lg text-slate-200">
                The limited edition Air Pulse series is finally here. Engineered
                for performance, designed for the streets.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button className="px-8 py-4 bg-primary text-background-dark font-bold rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2">
                  Shop Now
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </button>
                <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-bold rounded-full border border-white/20 hover:bg-white/20 transition-all">
                  View Lookbook
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="px-6 lg:px-20 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Shop by Category</h2>
              <p className="text-slate-500 mt-1">
                Find the perfect pair for your lifestyle
              </p>
            </div>
            <a
              href="#"
              className="text-primary font-bold flex items-center gap-1 hover:underline"
            >
              See All Categories{" "}
              <span className="material-symbols-outlined text-sm">
                open_in_new
              </span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category Card 1 */}
            <div className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer">
              <img
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbtKp14mxnTdhy2GJG9uWRJcEgWpCU8ATDQEZF1tif4LVrtXTc-bWK2-DrpZlOpsCu3Ub7SoKdmR8e8LgJapBQs2044XxeCkqlBMhqiSoyiorQ76WCEUR-0fflMeXbllB0AYLviJxL9F3VY6OZdHC5BMfqFi820XGxvdNxYa6P6qUGmTfPK6cvpiVHwaMHMo8UHu2ELXyGZAbLWk5uIbDh1_wEsk4Y3SgdN196WNFnONhv9w-sMIYuXA5aYSPR8D1tLLSgx8s0RWo"
                alt="Red performance running shoe close up"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white mb-2">Running</h3>
                <button className="text-white text-sm font-semibold py-2 px-4 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary hover:text-background-dark transition-colors">
                  Explore
                </button>
              </div>
            </div>

            {/* Category Card 2 */}
            <div className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer">
              <img
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMBkXX8P53hvH3Ml0MhVpf-6G9NwCPu1USfMz5s4qmjBLn8EbPZ6iiOmJwX6GI9DmjIChlkma8Tjy38JJ6Njhq0lx_EwC8fYyQlst-_XSUqwFL2jXjb5D4J0GwWarsNExUTPDiWxhmuj0pgJtQMLoVHwC7hHfDxDVZlQdk6J1mCAofoMkWzRAY1_01xbOHJd_H6uJo8PQinGVQerhukUJpJ1ilJ8IbudpVwCuePHpG9H1CZRQM3Ux-QGFhsE1rF9bZolsiSoyjCao"
                alt="Modern high top basketball sneakers"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Basketball
                </h3>
                <button className="text-white text-sm font-semibold py-2 px-4 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary hover:text-background-dark transition-colors">
                  Explore
                </button>
              </div>
            </div>

            {/* Category Card 3 */}
            <div className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer">
              <img
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgZicS_k_2tddPzM9kgzUuoG4NNTwGeQLpmm3nfXibtyWxs9jRb0Hn8leieLwbcvoP6L36CUsWIyvWBuf8ccJNK8YjdJk2ZGSfjhtD5ghBrwrcygPfKOCEcYx1JN6ixOOMfVhazXi20UMyFI434jMrnc4-GH5Js9gd8j06InFFSNwY4EvzesHfm4rEMOm7GUFbISR7D3g0JvaKwXNP3ZfnNa_AGmTBoD--awfOe-z6D4PgYF4gqtktbPLzKII82bqm4bXenSj5Kbk"
                alt="Casual lifestyle sneakers on a minimalist background"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Lifestyle
                </h3>
                <button className="text-white text-sm font-semibold py-2 px-4 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary hover:text-background-dark transition-colors">
                  Explore
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals Grid */}
      <section className="px-6 lg:px-20 py-12 bg-primary/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">Trending Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Product Item 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-primary/5 hover:shadow-xl transition-shadow group">
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-700 p-6">
                <img
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuADo0PQ0J-zxpgHALllQwlqpgM4P7m1_UK5YMCpKFSNd40bXf5Zdqc9MWKQYYhm670yv1Xxcu_1fGvVVpwAhnC8UCb0q-ivSz8UspetJxkyXmY6n1KWMC85hvPbGR1PgzOy-z5p5vjAiHVengdUnhpSssEDtCi2WwI4QOE-ORTuciF_0XcgCQx5tFj4tU-1Scrd2Qw65-v2eLPApOpgOixB3Tt6OacJiVqRX0jTvXF34uSJNtlNGRTDtSy8zCXf5S_7bWKJESFzObU"
                  alt="Black minimalist athletic sneaker"
                />
                <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                  HOT
                </span>
                <button className="absolute bottom-4 right-4 bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-primary">
                    favorite
                  </span>
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">
                  Performance
                </p>
                <h4 className="font-bold text-lg mb-2">Swift Flow Pro</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-primary">
                    $129.00
                  </span>
                  <button className="bg-primary/20 hover:bg-primary p-2 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">
                      add_shopping_cart
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Product Item 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-primary/5 hover:shadow-xl transition-shadow group">
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-700 p-6">
                <img
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfggzfiBveb5BSIcqXGwVZpGksXoLoyFyQuQdGP31mkKWOp2MXzyEXhoYHxPSz338ytu5LmRc0z2OQMu-pOjHrA6GbF7TNtcfQqB3nvuljlxzN6yeCWD9hOb-PjSXPTP2btSWG66CQqRTZwFdGbaRqSVAqVKiHBMQzVJMGQWAaAY_k5DMS3kHnAbVewEAsXnMvl_5Fq15p-F_A03jg-QAm8Df4CaFpdaEQgEHu3eO5LAZ-ppuYWDenD3oPj4NP9NN_Hfy4e_xboxM"
                  alt="Colorful retro-style sneaker"
                />
                <button className="absolute bottom-4 right-4 bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-primary">
                    favorite
                  </span>
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">
                  Lifestyle
                </p>
                <h4 className="font-bold text-lg mb-2">Retro Wave &apos;94</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-primary">
                    $110.00
                  </span>
                  <button className="bg-primary/20 hover:bg-primary p-2 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">
                      add_shopping_cart
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Product Item 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-primary/5 hover:shadow-xl transition-shadow group">
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-700 p-6">
                <img
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkXXTxcEpZGqIrbR42HuBhSGqRr16QtAewJjnGrUk9lyXxtWSy5-dYSScmgkyWC7kLY-mBCRgSiI2TaoEim_6cQbmQufXjy2nhu3URp8W-z3bOe60mZPkbWdlYMFsJxEAoCHRZf9-P8L5UfTON-XYyC_lLHPdeIb7nAZxQNqVOJwW-ePXzXQ9bVMBs9HqoSSQmcg7fec2vctkDqc5xFcAI-BR01oEx-D2I1b3mrDS-z3zPn6KC4rtrIeDiW5kEIqdMbF7lyUgY0Jc"
                  alt="Vibrant classic canvas sneaker"
                />
                <button className="absolute bottom-4 right-4 bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-primary">
                    favorite
                  </span>
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">
                  Classic
                </p>
                <h4 className="font-bold text-lg mb-2">Heritage Canvas Low</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-primary">
                    $85.00
                  </span>
                  <button className="bg-primary/20 hover:bg-primary p-2 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">
                      add_shopping_cart
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Product Item 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-primary/5 hover:shadow-xl transition-shadow group">
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-700 p-6">
                <img
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5G_6YN-0wKNYLfVMoqzyI7raFePYGGdPAxVpCExHVc8qAvETLu8o2pjN2_2-DG4DwH7G3Sk8NHOWBW_H6eEmKHZB6G0PL9T0zMZjQ5eT1nMfgCGucWfbG-H3ur_XUxeG7KNZKK0lImDxURA7czkDdLBkUYbCbk66B-R8gVkLV6XB5Jd7BBmeEvzWnW80_9BRYe4GJO_1RM8wGdr5eRKgCbZpZN9MxzjqNzmBMYwhlYi85SDxnhuogLyrhaFeXvVJopszCmLkcLY0"
                  alt="Modern textured trainer"
                />
                <span className="absolute top-3 right-3 bg-primary text-background-dark text-[10px] font-bold px-2 py-1 rounded">
                  NEW
                </span>
                <button className="absolute bottom-4 right-4 bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-primary">
                    favorite
                  </span>
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">
                  Training
                </p>
                <h4 className="font-bold text-lg mb-2">Apex Trainer V2</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-primary">
                    $145.00
                  </span>
                  <button className="bg-primary/20 hover:bg-primary p-2 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">
                      add_shopping_cart
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button className="px-10 py-3 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary hover:text-background-dark transition-all">
              Browse All Collection
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
