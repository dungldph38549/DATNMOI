import React from "react";

const Login = () => {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 to-background-light dark:from-primary/20 dark:to-background-dark">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-12">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <span className="material-symbols-outlined text-primary text-6xl mb-3">
            travel_explore
          </span>
          <h1 className="text-3xl font-bold tracking-tight">SneakerHouse</h1>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black mb-3">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Sign in to continue to your account
          </p>
        </div>

        {/* Form */}
        <form className="space-y-7">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              className="w-full px-5 py-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-primary outline-none text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-primary outline-none text-base"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg hover:bg-primary/90 transition-all text-lg"
          >
            Log In
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-10">
          <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
          <span className="px-4 text-sm text-slate-400">OR</span>
          <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-5">
  {/* Google */}
  <button className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    <span className="text-sm font-semibold">Google</span>
  </button>

  {/* Facebook */}
  <button className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.49c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
    <span className="text-sm font-semibold">Facebook</span>
  </button>
</div>

        {/* Sign Up */}
        <p className="mt-10 text-center text-base text-slate-500 dark:text-slate-400">
          Don’t have an account?{" "}
          <a href="#" className="text-primary font-bold hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
};

export default Login;