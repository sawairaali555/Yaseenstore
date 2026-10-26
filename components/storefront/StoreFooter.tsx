import { MapPin } from "lucide-react";

export default function StoreFooter({ rootCategories }: { rootCategories: string[] }) {
  return (
      <footer className="bg-[#172544] text-white pt-14 pb-8 border-t border-slate-800">
        <div className="wrap grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-white/10">
          {/* Col 1: Brand */}
          <div className="lg:col-span-4 space-y-4">
            <a href="/" className="inline-block">
              <span className="text-3xl font-black tracking-tight text-white leading-none">
                cartify<span className="text-amber-400">.</span>
                <span className="block text-[8px] tracking-[3px] font-bold text-slate-400 uppercase mt-1">
                  PAKISTAN
                </span>
              </span>
            </a>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Thoughtful finds and everyday essentials delivered across Pakistan. Browse in Pakistani Rupees with verified quality and cash on delivery.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold pt-1">
              <MapPin size={15} className="text-amber-400" />
              <span>Pakistan • PKR</span>
            </div>
            <div className="inline-block bg-white/10 border border-white/20 text-amber-300 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded">
              CASH ON DELIVERY (COD)
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Explore Catalog
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              {rootCategories.map((c) => (
                <li key={c}>
                  <a
                    href={'/products?category=' + encodeURIComponent(c)}
                    className="hover:text-white transition-colors"
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer Support
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>
                <a href="/track-order" className="hover:text-white transition-colors">
                  Track Your Order
                </a>
              </li>
              <li>
                <a href="/delivery" className="hover:text-white transition-colors">
                  Delivery Information
                </a>
              </li>
              <li>
                <a href="/returns" className="hover:text-white transition-colors">
                  Returns & Exchanges
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="/contact-us" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: About Cartify */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              About Us
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>
                <a href="/about" className="hover:text-white transition-colors">
                  Our Story
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/admin/login" className="text-amber-400 hover:underline">
                  Staff Admin Login
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="wrap pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <span>© 2026 Cartify Pakistan. All rights reserved.</span>
          <span>Sample products & prices • Test orders preview</span>
        </div>
      </footer>
  );
}

