import React from "react";

const Login = () => {
  return (
    <main className="flex-1 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Side: Visual Content */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/10">
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background-dark/60 to-transparent"></div>
          <img
            alt="Stylish lifestyle sneaker photo"
            className="absolute inset-0 object-cover w-full h-full scale-105 hover:scale-100 transition-transform duration-700"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6rHpD3LkjogX7xp9097aabvkxCakUIgjVYaD9ZOITCZC6DzynxwOkoDXccEbOhiwFvMujUBjzysLtaL9eRQzaT0Z3Lo5BTpapjI8-lBLTO13bZbQoTbN127oDNS1UA_Wkmt_gz-fEF-Ra2zusQqvZF4IpixM_BctoDoVGtYvo6zPoRoY5FS4JB6K22TATHPznxB_1Q9ciufADHwjhAhqj9XbuvI7Yx0IwU2oNku8X24xvtTLnj1YjSnmE757RSXknm_yM1pkwwVo"
          />
          <div className="relative z-20 flex flex-col justify-end p-16 w-full">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary text-4xl">
                travel_explore
              </span>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                SneakerHouse
              </h1>
            </div>
            <p className="text-white text-xl max-w-md font-light leading-relaxed">
              Step into the future of footwear. Your exclusive collection is
              just one click away.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-background-light dark:bg-background-dark">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="flex items-center gap-2 mb-10 lg:hidden">
              <span className="material-symbols-outlined text-primary text-3xl">
                travel_explore
              </span>
              <h2 className="text-2xl font-bold tracking-tight">
                SneakerHouse
              </h2>
            </div>

            <div className="mb-10">
              <h2 className="text-4xl font-black mb-3 tracking-tight">
                Welcome back
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Please enter your details to sign in to your account.
              </p>
            </div>

            <form className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium px-1">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary">
                    mail
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                    placeholder="name@example.com"
                    type="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-medium">Password</label>
                  <a
                    className="text-sm font-semibold text-primary hover:underline"
                    href="#"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary">
                    lock
                  </span>
                  <input
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                    placeholder="••••••••"
                    type="password"
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      visibility
                    </span>
                  </button>
                </div>
              </div>

              {/* Log In Button */}
              <button
                className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-[0.98]"
                type="submit"
              >
                Log In
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-background-light dark:bg-background-dark px-4 text-slate-400 font-medium tracking-widest">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-sm font-semibold">Google</span>
              </button>
              <button className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <svg
                  className="w-6 h-6 text-[#1877F2]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-sm font-semibold">Facebook</span>
              </button>
            </div>

            {/* Sign Up Link */}
            <p className="mt-12 text-center text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <a
                className="text-primary font-bold hover:underline"
                href="#"
              >
                Sign up for free
              </a>
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-auto pt-8 flex gap-6 text-xs text-slate-400">
            <a
              className="hover:text-primary transition-colors"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="hover:text-primary transition-colors"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="hover:text-primary transition-colors"
              href="#"
            >
              Help Center
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
