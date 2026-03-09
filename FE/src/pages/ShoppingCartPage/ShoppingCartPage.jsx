import React from "react";

export default function CartPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Main */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-4xl font-extrabold mb-8">Shopping Bag</h2>

        {/* Item */}
        <div className="flex gap-6 p-6 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100">
          <div className="w-40 h-40 bg-slate-100 rounded-lg overflow-hidden">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdbYy8oAwyyTxVjvv4XngQJMlUkF2LF0XRe6BYLU7zaXYjXxnlgzQDBOzAv-xkbAiW5BW1idttwT7kYMDA2Guwfso0iORDt4xCDDqFBqXAiTrvoDUnJUYh67fwXnepDae6CaFeoFdlWfXd31pnSIbIgU-C-_3YJ5MFHprzUsJjNxDukYHk5r-VExZXe6x0iHhgrbUFX4yqdYGfSTV-2m8drEPi6CIqykyt9bPGB20AQ7bAvOv32_LZDKYJhdKhW1sEZBIsU4DDYp8"
              alt="shoe"
            />
          </div>

          <div className="flex flex-col flex-grow justify-between">
            <div className="flex justify-between">
              <div>
                <h3 className="text-xl font-bold">Air Jordan 1 Retro High</h3>
                <p className="text-slate-500 text-sm">Chicago Red / White</p>
                <p className="text-slate-500 text-sm">Size: 10.5 US</p>
              </div>

              <p className="text-xl font-bold">$240.00</p>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center bg-slate-100 rounded-full px-2 py-1">
                <button className="p-1">
                  <span className="material-symbols-outlined">remove</span>
                </button>

                <span className="px-4 font-bold text-sm">1</span>

                <button className="p-1">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>

              <button className="flex items-center gap-1 text-red-500">
                <span className="material-symbols-outlined">delete</span>
                <span className="text-xs font-semibold uppercase">Remove</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
