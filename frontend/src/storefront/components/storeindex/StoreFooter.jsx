import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import useStoreSettings from "@/shared/hooks/useStoreSettings";

const StoreFooterComponent = function StoreFooter() {
  const { settings } = useStoreSettings()
  const logoUrl = settings?.logo
  const storeName = settings?.store_name || 'AuraStore'
  const supportEmail = settings?.support_email || 'support@aurastore.com'
  const supportPhone = settings?.support_phone || '+91 44 2817 9000'
  const description = settings?.description || 'Curating premium, hand-crafted designer streetwear, high-performance athletic apparel, and timeless accessories.'

  return (
    <footer className="bg-surface border-t border-app py-16 transition-colors duration-300">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Logo & Description */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white">
                <Zap size={14} strokeWidth={2.5} />
              </div>
            )}

            <span className="font-display font-bold text-base text-app">
              {logoUrl || settings?.store_name ? (
                <span>{storeName}</span>
              ) : (
                <>
                  Aura<span className="text-brand-500">Store</span>
                </>
              )}
            </span>
          </Link>

          <p className="text-xs text-muted leading-relaxed">
            {description}
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app">
            Shop Catalog
          </h4>

          <div className="flex flex-col gap-2 text-xs">
            <Link to="/products" className="text-muted hover:text-app">
              All Products
            </Link>

            <Link
              to="/products?collection=Summer"
              className="text-muted hover:text-app"
            >
              Summer Collection
            </Link>

            <Link
              to="/products?collection=Activewear"
              className="text-muted hover:text-app"
            >
              Activewear
            </Link>

            <Link
              to="/products?collection=Essentials"
              className="text-muted hover:text-app"
            >
              Daily Essentials
            </Link>
          </div>
        </div>

        {/* Customer Support */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app">
            Customer Services
          </h4>

          <div className="flex flex-col gap-2 text-xs">
            <Link to="/tracking" className="text-muted hover:text-app">
              Track Your Order
            </Link>

            <Link to="/profile/orders" className="text-muted hover:text-app">
              Return & Exchanges
            </Link>

            <a
              href={`mailto:${supportEmail}`}
              className="text-muted hover:text-app"
            >
              Contact Support
            </a>

            <span className="text-muted">Phone: {supportPhone}</span>
          </div>
        </div>

        {/* Newsletter */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app">
            Join Aura List
          </h4>

          <p className="text-xs text-muted leading-relaxed">
            Subscribe to get notifications about drops, exclusive discounts,
            and active campaigns.
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="email"
              placeholder="your.email@gmail.com"
              className="bg-app border border-app text-xs px-3 py-2 rounded-xl focus:outline-none w-full placeholder:text-muted"
            />

            <button className="bg-brand-500 hover:bg-brand-600 p-2 text-white rounded-xl transition-all">
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-app flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-muted">
        <p>
          © {new Date().getFullYear()} {storeName} Inc. All rights reserved.
          Made for premium commerce.
        </p>

        <div className="flex items-center gap-6">
          <Link to="/support/privacy" className="hover:text-app">
            Privacy Policy
          </Link>

          <Link to="/support/terms" className="hover:text-app">
            Terms of Use
          </Link>

          <Link
            to="/admin"
            className="text-brand-500 font-semibold hover:text-brand-600"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}

const StoreFooter = React.memo(StoreFooterComponent);
export default StoreFooter;