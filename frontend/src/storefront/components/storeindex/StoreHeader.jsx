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
import useStoreSettings from '@/shared/hooks/useStoreSettings'

const MOBILE_NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'T-shirt for mens', to: '/products?category=t-shirt&gender=Men' },
  { label: 'Track Pants for mens', to: '/products?category=track-pant&gender=Men' },
  { label: 'Trousers for mens', to: '/products?category=trouser&gender=Men' },
  { label: 'Shirt for mens', to: '/products?category=shirt&gender=Men' },
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
  const { settings } = useStoreSettings()
  const logoUrl = settings?.logo
  const storeName = settings?.store_name || 'AuraStore'
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);


  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setShowSearch(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          <Link to="/" className="flex items-center gap-2.5  group shrink-0">
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
              {logoUrl || settings?.store_name ? (
                <span>{storeName}</span>
              ) : (
                <>
                  My<span className="text-brand-500">Store</span>
                </>
              )}
            </span>
          </Link>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2  sm:gap-4">
            {/* Search Box - Desktop */}
            <div
              ref={searchRef}
              className="relative hidden md:flex items-center justify-end w-72"
            >
              <form
                onSubmit={handleSearchSubmit}
                className={`relative transition-all duration-300 ease-in-out ${
                  showSearch
                    ? "w-72 opacity-100 translate-x-0"
                    : "w-0 opacity-0 translate-x-4 pointer-events-none"
                } overflow-hidden`}
              >
                <input
                  autoFocus={showSearch}
                  type="text"
                  placeholder="Search premium apparel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm bg-surface border border-app rounded-full py-2 pl-4"
                />
              </form>

              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="absolute z-10 p-2 rounded-full hover:bg-surface"
                aria-label="Toggle search bar"
              >
                <Search size={20} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-full hover:bg-surface md:hidden"
              aria-label="Open search bar"
            >
              <Search size={20} />
            </button>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-surface text-app transition-colors duration-200"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="p-2 rounded-full hover:bg-surface text-app transition-colors duration-200 relative"
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
              className="p-2 rounded-full hover:bg-surface text-app transition-colors duration-200 relative"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              <CartBadge count={cartCount} />
            </button>

            {/* Account / Login */}
            {token && customer ? (
              <div className="relative hidden md:block group/profile">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-surface text-app transition-colors duration-200"
                >
                  <div className="h-7 w-7 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                    {customer.first_name.toUpperCase()}
                  </div>
                </Link>
                
                {/* Profile Hover Dropdown */}
                <div className="absolute right-0 mt-1.5 w-48 bg-app border border-app rounded-xl shadow-lg py-2 hidden group-hover/profile:block animate-fade-in z-50">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-app hover:bg-surface"
                  >
                    <User size={13} />
                    My Account
                  </Link>
                  <Link
                    to="/profile/orders"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-app hover:bg-surface"
                  >
                    <ClipboardList size={13} />
                    My Orders
                  </Link>
                  <hr className="border-app my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-surface text-left"
                  >
                    <LogOut size={13} />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/auth/login" className="hidden md:block">
                <User size={22} />
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className=" rounded-full hover:bg-surface text-app transition-colors duration-200"
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {showSearch && (
        <div className="fixed h-fit inset-0 top-16 z-50 md:hidden bg-app">
          <form onSubmit={handleSearchSubmit} className="p-4 border-b flex items-center gap-3">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 bg-surface border border-app rounded-full py-2 px-5 text-app focus:outline-none"
              aria-label="Search premium apparel"
            />

            <button type="button" onClick={() => setShowSearch(false)} aria-label="Close search bar">
              <X size={22} />
            </button>
          </form>
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
          <div className="fixed top-0 right-0 h-full w-72 bg-app border-l border-app z-50  shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-end p-4">
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu">
                <X size={22} />
              </button>
            </div>

            {/* Navigation
                Each entry maps to a real, filterable destination.
                category/gender values must match the Category.name and
                ProductGender.gender values used by the backend service
                layer (see app/modules/products/service.py) so the query
                params here actually filter results on /products. */}
            <div className="flex flex-col py-3">
              {MOBILE_NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  state={{ fromMenu: true }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-5 py-3 uppercase hover:bg-surface"
                >
                  {link.label}
                </Link>
              ))}

              <div className="flex flex-col md:hidden ">
                <Link
                  to="/profile/orders"
                  className="px-5 py-3 uppercase hover:bg-surface"
                >
                  My Orders
                </Link>

                {/* user account setting */}
                <hr className="border-app my-1" />
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-xs text-app hover:bg-surface"
                >
                  <User size={13} />
                  My Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-surface text-left"
                >
                  <LogOut size={13} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const StoreHeader = React.memo(StoreHeaderComponent);
export default StoreHeader;