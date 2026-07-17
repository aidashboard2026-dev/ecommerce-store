import React, { useState, useEffect, useRef, useCallback } from "react";
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

// ─── Static nav config ───────────────────────────────────────────────────────
const MOBILE_NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "T-Shirt for Mens", to: "/products?category=t-shirt&gender=Men" },
  { label: "Track Pant for Mens", to: "/products?category=track-pants&gender=Men",},
  { label: "Trousers for Mens", to: "/products?category=trousers&gender=Men" },
  { label: "Shirt for Mens", to: "/products?category=shirts&gender=Men" },
  { label: "Custom products", to: "/custom" },
  { label: "Offers", to: "/offers" },
  { label: "My Orders", to: "/profile/orders" },
  // { label: "Track Order", to: "/tracking" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Extracts initials from a name string: "John Doe" → "JD" */
function generateInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Build a display name from customer object */
function getCustomerName(customer) {
  if (!customer) return "Customer";
  return (
    customer.google_name ||
    [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Customer"
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
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

  // useEffect(() => {
  //   console.log("=== StoreHeader MOUNTED ===");
  //   return () => console.log("=== StoreHeader UNMOUNTED ===");
  // }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const customerName = getCustomerName(customer);

  // ── Sync search input with URL ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchVal = params.get("search") || "";
    setSearchQuery(searchVal);
    setShowSearch(!!searchVal);
  }, [location.search]);

  // ── Close all menus on route change ───────────────────────────────────────
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    setShowSearch(false);
  }, [location.pathname, location.search]);

  // ── Scroll detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Lock body scroll when mobile menu is open ─────────────────────────────
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // ── Escape key handler ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (mobileMenuOpen) setMobileMenuOpen(false);
      if (profileMenuOpen) setProfileMenuOpen(false);
      if (showSearch) setShowSearch(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, profileMenuOpen, showSearch]);

  // ── Click outside (profile dropdown + desktop search) ─────────────────────
  useEffect(() => {
    const onMouseDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target) &&
        !searchQuery.trim()
      ) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [searchQuery]);

  // ── Search submit ─────────────────────────────────────────────────────────
  const handleSearchSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      navigate(`/products?search=${encodeURIComponent(q)}`);
      setShowSearch(false);
    },
    [searchQuery, navigate],
  );

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ════════════════════ HEADER BAR ════════════════════ */}
      <header
        className={clsx(
          "sticky top-0 z-40 store-bg transition-all duration-300 w-full border-b border-app",
          "py-3 px-3 sm:px-10",
          "shadow-[0_1px_20px_rgba(0,0,0,0.12)]",
          scrolled && "py-2 shadow-[0_4px_30px_rgba(0,0,0,0.2)]",
        )}
      >
        <div className="mx-auto w-full max-w-[1400px] flex items-center justify-between gap-4">
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0 min-h-[44px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
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

          {/* ── Right Actions ────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Desktop Search */}
            <div
              ref={searchRef}
              className={clsx(
                "relative hidden sm:flex items-center p-1 justify-end transition-all duration-300",
                showSearch ? "w-72" : "w-11",
              )}
            >
              <form
                onSubmit={handleSearchSubmit}
                className={clsx(
                  "relative transition-all duration-300 ease-in-out overflow-hidden",
                  showSearch
                    ? "w-full opacity-100 translate-x-0"
                    : "w-0 opacity-0 translate-x-4 pointer-events-none",
                )}
              >
                <input
                  autoFocus={showSearch}
                  type="text"
                  placeholder="Search premium apparel…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 w-full bg-surface border border-app rounded-full py-1.5 px-5 text-app text-sm"
                  aria-label="Search products"
                />
              </form>
              <button
                type="button"
                onClick={() => {
                  if (showSearch && searchQuery.trim()) {
                    handleSearchSubmit();
                  } else {
                    setShowSearch((v) => !v);
                  }
                }}
                className={clsx(
                  "absolute right-0 z-10 w-11 h-11 flex items-center justify-center rounded-full text-app transition-colors",
                  showSearch ? "bg-transparent" : "hover:bg-surface",
                )}
                aria-label={showSearch ? "Submit search" : "Open search"}
              >
                <Search size={20} />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200"
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="flex w-11 h-11 items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200 relative"
              aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} items)` : ""}`}
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <span className=" absolute top-1 right-1 flex bg-[var(--count-bg)] items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-white text-[10px] font-bold leading-none">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              type="button"
              onClick={() => dispatch(openCartDrawer())}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200 relative"
              aria-label={`Cart${cartCount > 0 ? ` (${cartCount} items)` : ""}`}
            >
              <ShoppingCart size={18} />
              <CartBadge count={cartCount} />
            </button>

            {/* ── Account (Desktop) ──────────────────────────────────────── */}
            {token && customer ? (
              <div ref={profileRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className={clsx(
                    "w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    profileMenuOpen && "ring-2 ring-brand-500",
                  )}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="true"
                  aria-label="User profile menu"
                >
                  {customer.photo_url ? (
                    <img
                      src={customer.photo_url}
                      alt={customerName}
                      className="h-9 w-9 rounded-full object-cover border border-app"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm font-semibold">
                      {generateInitials(customerName)}
                    </div>
                  )}
                </button>

                {profileMenuOpen && (
                  <div
                    className="absolute right-0 mt-1.5 w-56 bg-app border border-app rounded-xl shadow-lg py-2 animate-fade-in z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-app truncate">
                        {customerName}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {customer.email}
                      </p>
                    </div>
                    <hr className="border-app my-1" />
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-app hover:bg-surface transition-colors"
                      role="menuitem"
                    >
                      <User size={13} /> My Account
                    </Link>
                    <hr className="border-app my-1" />
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="hidden md:flex w-11 h-11 items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200"
                aria-label="Log in"
              >
                <User size={20} />
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-200"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════ MOBILE MENU DRAWER ════════════════════ */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          {/* Drawer */}
          <nav
            className="fixed top-0 right-0 h-full w-72 bg-app border-l border-app z-50 shadow-xl flex flex-col animate-[slideInRight_250ms_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-app shrink-0">
              <span className="font-display font-bold text-app">Menu</span>
              <div className="flex flex-row items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="w-12 h-12 flex sm:hidden items-center justify-center rounded-full hover:bg-surface text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
                  aria-label="Toggle Theme"
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={closeMobileMenu}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface text-app transition-colors"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Mobile Search Button */}
            <div
              ref={searchRef}
              className={clsx(
                "relative flex sm:hidden items-center p-1 justify-end transition-all duration-300",
              )}
            >
              <form
                onSubmit={handleSearchSubmit}
                className={clsx(
                  "relative w-full transition-all duration-300 ease-in-out overflow-hidden",
                )}
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Search premium apparel…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 w-full bg-surface border border-app rounded-md py-2 px-5 text-app text-sm"
                  aria-label="Search products"
                />
              </form>
              <button
                type="button"
                className="absolute right-0 z-10 w-11 h-11 flex items-center justify-center rounded-full  text-app "
                aria-label={showSearch ? "Submit search" : "Open search"}
              >
                <Search size={20} />
              </button>
            </div>

            {/* Scrollable Links */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-2">
              {MOBILE_NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  state={{ fromMenu: true }}
                  onClick={closeMobileMenu}
                  className="block px-5 py-3.5 uppercase text-sm font-semibold tracking-wider text-app hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                >
                  {link.label}
                </Link>
              ))}

              {/* Auth Section */}
              
            </div>

            {/* Mobile Actions Drawer Footer */}
            <div className="mt-auto p-3 border-t border-app flex items-center justify-around">
              {token && customer ? (
                <>
                  <div className="flex items-center gap-3 px-5 py-4">
                    {customer.photo_url ? (
                      <img
                        src={customer.photo_url}
                        alt={customerName}
                        className="h-11 w-11 rounded-full object-cover border border-app shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                        {generateInitials(customerName)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app truncate">
                        {customerName}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {customer.email}
                      </p>
                    </div>
                  </div>
                  <hr className="border-app" />
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-5 py-3 text-sm text-app hover:bg-surface transition-colors"
                  >
                    <User size={16} /> My Account
                  </Link>
                  <hr className="border-app my-2" />
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 px-5 py-3 text-sm text-red-500 hover:bg-surface text-left transition-colors"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/auth/login"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-5 py-3 text-sm text-app hover:bg-surface transition-colors"
                >
                  <User size={16} /> Login / Sign Up
                </Link>
              )}

            </div>
          </nav>
        </>
      )}
    </>
  );
};

const StoreHeader = React.memo(StoreHeaderComponent);
export default StoreHeader;
