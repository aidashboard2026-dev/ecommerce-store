import React, { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { 
  Zap, ShoppingCart, Heart, User, Sun, Moon, 
  Menu, X, Search, LogOut, ArrowRight, ClipboardList, Package, MapPin
} from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '@/shared/hooks/useAuth'
import { customerLogout } from '@/storefront/store/customerSlice'

export default function StorefrontLayout() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const location = useLocation()
  
  const { customer, token } = useSelector((s) => s.customer)
  const cartItems = useSelector((s) => s.cart.items)
  const wishlistItems = useSelector((s) => s.wishlist.items)
  
  const { isDark, toggle: toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [showSubProducts, setShowSubProducts] = useState(false);

  useEffect(() => {
    const closeMenu = () => setShowSubProducts(false)

    if (showSubProducts) {
      document.addEventListener("click", closeMenu)
    }

    return () => {
      document.removeEventListener("click", closeMenu)
    }
  }, [showSubProducts])
  // Track page scroll to toggle header background glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)
  const wishlistCount = wishlistItems.length

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = () => {
    dispatch(customerLogout())
    navigate('/')
  } 

  
  

  return (
    <div className="min-h-screen bg-app flex flex-col transition-colors duration-300">
      
      {/* Top Promotional Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs py-2 px-4 text-center font-medium tracking-wide">
        ⚡ FREE SHIPPING ON ORDERS OVER ₹999 & COMPLIMENTARY TRIAL GIFTS IN EVERY ORDER!
      </div>

      {/* Main Glassmorphic Header */}
      <header className={clsx(
        "sticky top-0 z-40 transition-all duration-300 border-b",
        scrolled 
          ? "bg-app/80 backdrop-blur-lg border-app py-3 shadow-sm" 
          : "bg-transparent border-transparent py-5"
      )}>
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-glow-sm transition-transform duration-300 group-hover:scale-105">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg text-app tracking-tight">
              Aura<span className="text-brand-500">Store</span>
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
            <Link to="/" className={clsx(
              "transition-colors duration-200 hover:text-brand-500",
              location.pathname === '/' ? "text-brand-500 font-semibold" : "text-app/80"
            )}>
              Home
            </Link>
            <Link to="/products" className={clsx(
              "transition-colors duration-200 hover:text-brand-500",
              location.pathname === '/products' ? "text-brand-500 font-semibold" : "text-app/80"
            )}>
              Shop Catalog
            </Link>
            <div>
            <Link
              to="/sub-products"
              className={clsx(
                "transition-colors duration-200 hover:text-brand-500",
                location.pathname === "/sub-products"
                  ? "text-brand-500 font-semibold"
                  : "text-app/80"
              )}
            >
              Sub Products
            </Link>

              {showSubProducts && (
                <div
                  className="
                    absolute
                    top-full
                    left-[-370px]
                    mt-3
                    grid
                    grid-cols-5
                    gap-10
                    w-[1250px]
                    bg-white
                    rounded-2xl
                    shadow-xl
                    p-8
                    z-50
                  "
                >

                {/* T-Shirts */}
                <div>
                  <h3 className="font-bold mb-3 text-brand-500">
                    T-Shirts
                  </h3>

                  <Link
                    to="/category/round-neck"
                    onClick={() => setShowSubProducts(false)}
                    className="block mb-2 hover:text-brand-500"
                  >
                    Round neck T- shirt 
                  </Link>

                  <Link to="/category/v-neck" className="block mb-2 hover:text-brand-500">
                    V-Neck T-Shirt
                  </Link>

                  <Link to="/category/polo" className="block mb-2 hover:text-brand-500">
                    Polo T-Shirt
                  </Link>

                  <Link to="/category/henley" className="block mb-2 hover:text-brand-500">
                    Henley T-Shirt
                  </Link>

                  <Link to="/category/oversized" className="block mb-2 hover:text-brand-500">
                    Oversized T-Shirt
                  </Link>

                  <Link to="/category/graphic" className="block mb-2 hover:text-brand-500">
                    Graphic Printed T-Shirt
                  </Link>

                  <Link to="/category/plain" className="block mb-2 hover:text-brand-500">
                    Plain T-Shirt
                  </Link>

                  <Link to="/category/back-print" className="block py-1 hover:text-brand-500 transition-colors">
                    Back Print T-Shirt
                  </Link>

                  <Link to="/category/color-tshirt" className="block py-1 hover:text-brand-500 transition-colors">
                    Color T-Shirt
                  </Link>

                  <Link to="/category/embroidery-tshirt" className="block py-1 hover:text-brand-500 transition-colors">
                    Embroidery Design T-Shirt
                  </Link>
                </div>

                {/* Premium Apparel */}
                <div>
                  <h3 className="font-bold mb-3 text-brand-500">
                    Premium Apparel
                  </h3>

                  <Link to="/category/korean-shirt" className="block mb-2 hover:text-brand-500">
                    Korean Style Shirts
                  </Link>

                  <Link to="/category/minimal-polo" className="block mb-2 hover:text-brand-500">
                    Minimal Premium Polo
                  </Link>

                  <Link to="/category/hoodie" className="block mb-2 hover:text-brand-500">
                    Hoodie
                  </Link>

                  <Link to="/category/oversized-hoodie" className="block mb-2 hover:text-brand-500">
                    Oversized Hoodie
                  </Link>

                  <Link to="/category/jersey" className="block hover:text-brand-500">
                    Jersey
                  </Link>
                </div>

                {/* Sports Wear */}
                <div>
                  <h3 className="font-bold mb-3 text-brand-500">
                    Sports Wear
                  </h3>

                  <Link to="/category/sports-tshirt" className="block mb-2 hover:text-brand-500">
                    Sports T-Shirts
                  </Link>

                  <Link to="/category/sports-shorts" className="block mb-2 hover:text-brand-500">
                    Sports Shorts
                  </Link>

                  <Link to="/category/track-pants" className="block py-1 hover:text-brand-500 transition-colors">
                    Track Pants
                  </Link>

                  <Link to="/category/shorts" className="block py-1 hover:text-brand-500 transition-colors">
                    Shorts
                  </Link>

                  <Link to="/category/pant"   className="block py-1 hover:text-brand-500 transition-colors">
                    Pant
                  </Link>
                </div>

                {/* Gifts & Printing */}
                <div>
                  <h3 className="font-bold mb-3 text-brand-500">
                    Gifts & Printing
                  </h3>

                  <Link to="/category/magic-mug" className="block mb-2 hover:text-brand-500">
                    Magic Mug Print
                  </Link>

                  <Link to="/category/photo-frame" className="block mb-2 hover:text-brand-500">
                    Photo Frames
                  </Link>

                  <Link to="/category/metal-frame" className="block mb-2 hover:text-brand-500">
                    Metal Frames
                  </Link>

                  <Link to="/category/mouse-pad" className="block mb-2 hover:text-brand-500">
                    Mouse Pads
                  </Link>

                  <Link to="/category/personal-gifts" className="block hover:text-brand-500">
                    Personal Gifts
                  </Link>

                  <Link to="/category/White Mug" className="block py-1 hover:text-brand-500 transition-colors">
                    White Mug
                  </Link>

                  <Link to="/category/Sublimation-products" className="block py-1 hover:text-brand-500 transition-colors">
                    Sublimation Products
                  </Link>
                </div>

                {/* Accessories */}
                <div>
                  <h3 className="font-bold mb-3 text-brand-500">
                    Accessories
                  </h3>

                  <Link to="/category/water-bottle" className="block mb-2 hover:text-brand-500">
                    Water Bottles
                  </Link>

                  <Link to="/category/tumbler" className="block mb-2 hover:text-brand-500">
                    Skinny Tumblers
                  </Link>

                  <Link to="/category/glassware" className="block mb-2 hover:text-brand-500">
                    Glass Ware
                  </Link>

                  <Link to="/category/hats" className="block mb-2 hover:text-brand-500">
                    Hats & Caps
                  </Link>

                  <Link to="/category/cards" className="block py-1 hover:text-brand-500 transition-colors">
                    Wedding & Greeting Cards
                  </Link>

                  <Link to="/category/pillows" className="block py-1 hover:text-brand-500 transition-colors">
                    Pillows
                  </Link>
                </div>

              </div>
              )}
            </div>
            <Link to="/tracking" className={clsx(
              "transition-colors duration-200 hover:text-brand-500",
              location.pathname === '/tracking' ? "text-brand-500 font-semibold" : "text-app/80"
            )}>
              Track Order
            </Link>
          </nav>

          {/* Search Box - Desktop */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search premium apparel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-app rounded-full py-1.5 pl-4 pr-10 text-xs text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-300 placeholder:text-muted"
            />
            <button type="submit" className="absolute right-3 text-muted hover:text-app transition-colors duration-200">
              <Search size={14} />
            </button>
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            
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
            <Link 
              to="/cart" 
              className="p-2 rounded-full hover:bg-surface text-app transition-colors duration-200 relative"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Account / Login */}
            {token && customer ? (
              <div className="relative group/profile">
                <Link to="/profile" className="flex items-center gap-2 p-1.5 rounded-full hover:bg-surface text-app transition-colors duration-200">
                  <div className="h-7 w-7 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                    {customer.first_name[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold max-w-[80px] truncate">{customer.first_name}</span>
                </Link>
                {/* Profile Hover Dropdown */}
                <div className="absolute right-0 mt-1.5 w-48 bg-app border border-app rounded-xl shadow-lg py-2 hidden group-hover/profile:block animate-fade-in z-50">
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-xs text-app hover:bg-surface">
                    <User size={13} />
                    My Account
                  </Link>
                  <Link to="/profile/orders" className="flex items-center gap-2 px-4 py-2 text-xs text-app hover:bg-surface">
                    <ClipboardList size={13} />
                    My Orders
                  </Link>
                  <hr className="border-app my-1" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-surface text-left">
                    <LogOut size={13} />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/auth/login" className="flex items-center gap-1.5 btn-primary py-1.5 px-4 rounded-full text-xs">
                <User size={13} />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-full hover:bg-surface text-app md:hidden transition-colors duration-200"
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>

          </div>

        </div>
      </header>

      {/* Mobile Sidebar Navigation Drawer */}
      <div className={clsx(
        "fixed inset-0 z-50 transition-opacity duration-300 md:hidden",
        mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
        
        {/* Drawer container */}
        <div className={clsx(
          "absolute right-0 top-0 bottom-0 w-[270px] bg-app border-l border-app shadow-2xl flex flex-col p-5 transition-transform duration-300 ease-out z-10",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-8">
            <span className="font-display font-bold text-base text-app">Menu</span>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-xl border border-app hover:bg-surface text-muted hover:text-app"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar inside drawer */}
          <form onSubmit={handleSearchSubmit} className="relative mb-6">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-app rounded-xl py-2 pl-4 pr-10 text-xs text-app focus:outline-none placeholder:text-muted"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app">
              <Search size={14} />
            </button>
          </form>

          {/* Nav items list */}
          <nav className="flex flex-col gap-4 font-medium text-sm">
            <Link to="/" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface text-app/80 hover:text-brand-500">
              <Package size={16} /> Home
            </Link>
            <Link to="/products" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface text-app/80 hover:text-brand-500">
              <ShoppingCart size={16} /> Shop Catalog
            </Link>
            <Link to="/tracking" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface text-app/80 hover:text-brand-500">
              <MapPin size={16} /> Track Order
            </Link>
            {token && customer && (
              <>
                <Link to="/profile" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface text-app/80 hover:text-brand-500">
                  <User size={16} /> My Account
                </Link>
                <Link to="/profile/orders" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface text-app/80 hover:text-brand-500">
                  <ClipboardList size={16} /> My Orders
                </Link>
              </>
            )}
          </nav>

          {/* Logout or login button in drawer footer */}
          <div className="mt-auto pt-6 border-t border-app">
            {token && customer ? (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 w-full justify-center py-2 px-4 border border-red-500/30 text-red-500 rounded-xl text-xs hover:bg-red-500/5 transition-all"
              >
                <LogOut size={14} /> Log Out
              </button>
            ) : (
              <Link 
                to="/auth/login" 
                className="flex items-center gap-2 w-full justify-center btn-primary py-2 rounded-xl text-xs"
              >
                <User size={14} /> Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Page Layout Wrapper */}
      <main className="flex-1 w-full relative">
        <Outlet />
      </main>

      {/* Modern High-End Footer */}
      <footer className="bg-surface border-t border-app py-16 transition-colors duration-300">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white">
                <Zap size={14} strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-base text-app">
                Aura<span className="text-brand-500">Store</span>
              </span>
            </Link>
            <p className="text-xs text-muted leading-relaxed">
              Curating premium, hand-crafted designer streetwear, high-performance athletic apparel, and timeless accessories.
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app">Shop Catalog</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/products" className="text-muted hover:text-app">All Products</Link>
              <Link to="/products?collection=Summer" className="text-muted hover:text-app">Summer Collection</Link>
              <Link to="/products?collection=Activewear" className="text-muted hover:text-app">Activewear</Link>
              <Link to="/products?collection=Essentials" className="text-muted hover:text-app">Daily Essentials</Link>
            </div>
          </div>

          {/* Customer Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app">Customer Services</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/tracking" className="text-muted hover:text-app">Track Your Order</Link>
              <Link to="/profile/orders" className="text-muted hover:text-app">Return & Exchanges</Link>
              <a href="mailto:support@aurastore.com" className="text-muted hover:text-app">Contact Support</a>
              <span className="text-muted">Phone: +91 44 2817 9000</span>
            </div>
          </div>

          {/* Newsletter signup */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app">Join Aura List</h4>
            <p className="text-xs text-muted leading-relaxed">Subscribe to get notifications about drops, exclusive discounts, and active campaigns.</p>
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
        
        {/* Footer bottom bar */}
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-app flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-muted">
          <p>© {new Date().getFullYear()} AuraStore Inc. All rights reserved. Made for premium commerce.</p>
          <div className="flex items-center gap-6">
            <Link to="/support/privacy" className="hover:text-app">Privacy Policy</Link>
            <Link to="/support/terms" className="hover:text-app">Terms of Use</Link>
            <Link to="/admin" className="text-brand-500 font-semibold hover:text-brand-600">Admin Dashboard</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}