const FooterComponent = () => {
  return (
    <footer className="bg-background-dark text-white pt-20 pb-10 px-6 lg:px-20 border-t border-white/5 font-display">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1 rounded">
                <span className="material-symbols-outlined text-background-dark">
                  vertical_split
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                SNEAKERHOUSE
              </h2>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Redefining street culture since 2010. We curate the world&apos;s
              most exclusive footwear for those who walk their own path.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">public</span>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  photo_camera
                </span>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  play_circle
                </span>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-lg font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-slate-400">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  New Arrivals
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Best Sellers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Release Calendar
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Sneaker Care
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Size Guide
                </a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-lg font-bold mb-6">Customer Support</h4>
            <ul className="space-y-4 text-slate-400">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Order Tracking
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Returns &amp; Exchanges
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Shipping Information
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  FAQs
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-bold mb-6">Join the Community</h4>
            <p className="text-slate-400 text-sm mb-4">
              Get early access to exclusive drops and insider news.
            </p>
            <form className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-background-dark font-bold py-3 rounded-lg hover:brightness-110 transition-all"
              >
                Subscribe Now
              </button>
            </form>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-sm">
          <p>© 2024 SNEAKERHOUSE INC. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterComponent;
