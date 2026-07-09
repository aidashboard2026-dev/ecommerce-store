import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import clsx from "clsx";
import {
  Zap,
  ShoppingCart,
  Heart,
  User,
  Sun,
  Moon,
  Search,
  Menu,
  X,
  LogOut,
  ClipboardList,
} from "lucide-react";
import { CartBadge } from "@/storefront/components/shoppingcart";
import { openCartDrawer } from "@/storefront/store/cartSlice";
import useStoreSettings from "@/shared/hooks/useStoreSettings";

// Static nav config — module scope so it isn't re-allocated every render.
// `to` values must resolve against real routes/filters (see AppRoutes.jsx
// CategoryRedirect + ProductsList.jsx searchParams contract). Do not point
// these at "/sub-products" — that route is a dead catch-all redirect to
// /products with no category context.
const MOBILE_NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: "T-Shirts for Mens", to: "/products?category=t-shirt&gender=Men" },
  { label: "Track Pants for Mens", to: "/products?category=track-pant&gender=Men" },
  { label: "Trousers for Mens", to: "/products?category=trouser&gender=Men" },
  { label: "Shirts for Mens", to: "/products?category=shirt&gender=Men" },
  { label: 'Custom product', to: '/custom' },
  { label: 'Offers', to: '/offers' },
  { label: 'Track Order', to: '/tracking' },
]

const StoreHeaderComponent = function StoreHeader({
  toggleTheme,
  isDark,
  wishlistCount,
  cartCount,
  token,
  customer,
  handleLogout,
}) {
  const dispatch = useDispatch();
  const { settings } = useStoreSettings();
  const logoUrl = settings?.logo;
  const storeName = import.meta.env.VITE_STORE_NAME || "My Designers";
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    console.log("=== StoreHeader MOUNTED ===");
    return () => console.log("=== StoreHeader UNMOUNTED ===");
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [showSubProducts, setShowSubProducts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Sync search input with URL search param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchVal = params.get("search") || "";
    setSearchQuery(searchVal);
    if (searchVal) {
      setShowSearch(true);
    }
  }, [location.search]);

  useEffect(() => {
    const closeMenu = () => setShowSubProducts(false);

    if (showSubProducts) {
      document.addEventListener("click", closeMenu);
    }

    return () => {
      document.removeEventListener("click", closeMenu);
    };
  }, [showSubProducts]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Click outside handler for search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        if (!searchQuery.trim()) {
          setShowSearch(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchQuery]);

  // Click outside handler for profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-40 store-bg transition-all py-3 px-3 sm:px-10 w-full duration-300 border-b border-app shadow-[0_1px_20px_rgba(0,0,0,0.12)]",
          scrolled,
        )}
      >
        <div className="mx-auto w-full max-w-[1400px] flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="h-9 w-9 rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-glow-sm transition-transform duration-300 group-hover:scale-105">
                <Zap size={18} strokeWidth={2.5} />
              </div>
            )}
            <span className="font-display font-bold text-lg text-app tracking-tight">
              {storeName}
            </span>
          </Link>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Search Box - Desktop */}
            <div
              ref={searchRef}
              className={clsx(
                "relative hidden md:flex items-center justify-end transition-all duration-300",
                showSearch ? "w-72" : "w-11"
              )}
            >
              <form
                onSubmit={handleSearchSubmit}
                className={clsx(
                  "relative transition-all duration-300 ease-in-out overflow-hidden",
                  showSearch ? "w-full opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-4 pointer-events-none"
                )}
              >
                <input
                  autoFocus={showSearch}
                  type="text"
                  placeholder="Search premium apparel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm bg-surface border border-app rounded-full py-2 pl-4 pr-12 text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
              </form>

              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="absolute right-0 z-10 w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Toggle search"
              >
                <Search size={20} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Open search"
            >
              <Search size={20} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200 relative"
              aria-label="Wishlist"
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              type="button"
              onClick={() => dispatch(openCartDrawer())}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200 relative"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              <CartBadge count={cartCount} />
            </button>

            {/* Account / Login */}
            {token && customer ? (
              <div ref={profileRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="true"
                  aria-label="User Profile Menu"
                >
                  {customer?.photo_url ? (
                    <img
                      src={customer.photo_url}
                      alt={
                        customer.google_name ||
                        customer.first_name ||
                        "Customer"
                      }
                      className="h-7 w-7 rounded-full object-cover border border-app"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                      {(
                        customer.google_name ||
                        customer.first_name ||
                        "?"
                      )[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Profile Click Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-app border border-app rounded-xl shadow-lg py-2 animate-fade-in z-50">
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-xs text-app hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <User size={13} />
                      My Account
                    </Link>
                    <Link
                      to="/profile/orders"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-xs text-app hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <ClipboardList size={13} />
                      My Orders
                    </Link>
                    <hr className="border-app my-1" />
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-xs text-red-500 hover:bg-surface text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <LogOut size={13} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth/login" className="w-11 h-11 hidden md:flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200" aria-label="Log in">
                <User size={22} />
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200"
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {showSearch && (
        <div className="fixed h-fit inset-0 top-16 z-50 md:hidden bg-app">
          <div className="p-4 border-b flex items-center gap-3">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 bg-surface border-0 rounded-full py-2 px-5 text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />

            <button onClick={() => setShowSearch(false)} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label="Close search">
              <X size={22} />
            </button>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40 "
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-72 bg-app border-l border-app z-50 shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-app">
              <span className="font-display font-bold text-lg text-app">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label="Close navigation menu">
                <X size={22} />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto flex flex-col py-3">
              {MOBILE_NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  state={{ fromMenu: true }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-5 py-4 uppercase hover:bg-surface text-sm font-semibold tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {link.label}
                </Link>
              ))}

              {token && customer ? (
                <div className="flex flex-col md:hidden">
                  <Link
                    to="/profile/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-5 py-4 uppercase hover:bg-surface text-sm font-semibold tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    My Orders
                  </Link>

                  {/* user account setting */}
                  <hr className="border-app my-1" />
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-5 py-4 text-xs text-app hover:bg-surface h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <User size={13} />
                    My Account
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2 px-5 py-4 text-xs text-red-500 hover:bg-surface text-left h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <LogOut size={13} />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-col md:hidden">
                  <hr className="border-app my-1" />
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-5 py-4 uppercase hover:bg-surface text-sm font-semibold tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    Sign In / Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Actions Drawer Footer */}
            <div className="mt-auto p-5 border-t border-app flex items-center justify-around md:hidden">
              <button
                onClick={toggleTheme}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors relative"
                aria-label="Wishlist"
              >
                <Heart size={20} />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};

const StoreHeader = React.memo(StoreHeaderComponent);
export default StoreHeader;