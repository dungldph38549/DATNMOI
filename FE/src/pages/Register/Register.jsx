import React from "react";

const Register = () => {
  return (
    <main className="flex-1 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="min-h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side - Hero Image */}
        <div className="hidden lg:flex relative overflow-hidden">
          <img
            className="absolute inset-0 w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbtKp14mxnTdhy2GJG9uWRJcEgWpCU8ATDQEZF1tif4LVrtXTc-bWK2-DrpZlOpsCu3Ub7SoKdmR8e8LgJapBQs2044XxeCkqlBMhqiSoyiorQ76WCEUR-0fflMeXbllB0AYLviJxL9F3VY6OZdHC5BMfqFi820XGxvdNxYa6P6qUGmTfPK6cvpiVHwaMHMo8UHu2ELXyGZAbLWk5uIbDh1_wEsk4Y3SgdN196WNFnONhv9w-sMIYuXA5aYSPR8D1tLLSgx8s0RWo"
            alt="White sneakers on display"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-12">
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              The ultimate destination for sneakerheads.
            </h2>
            <p className="text-slate-300 text-lg max-w-md">
              Join over 1 million collectors and get early access to the
              world&apos;s most exclusive drops.
            </p>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                Create Account
              </h1>
              <p className="text-slate-500 mt-2">
                Join the community and start your collection today.
              </p>
            </div>

            <form className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-bold"
                >
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    person
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-bold"
                >
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-bold"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                      lock
                    </span>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-bold"
                  >
                    Confirm
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                      shield
                    </span>
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-center gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  I agree to the{" "}
                  <a
                    href="#"
                    className="text-primary font-semibold hover:underline"
                  >
                    Terms &amp; Conditions
                  </a>{" "}
                  and Privacy Policy.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 transition-all"
              >
                Create Account
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background-light dark:bg-background-dark px-4 text-slate-400 font-bold tracking-widest">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-slate-700 rounded-full font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-slate-700 rounded-full font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Apple
              </button>
            </div>

            {/* Login Link */}
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <a
                href="#"
                className="text-primary font-bold hover:underline"
              >
                Log In
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Register;
