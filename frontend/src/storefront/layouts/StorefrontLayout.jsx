import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import { useTheme } from "@/shared/hooks/useAuth";
import { customerLogout } from "@/storefront/store/customerSlice";

import StoreHeader from "@/storefront/components/StoreHeader";
import StoreFooter from "@/storefront/components/StoreFooter";

export default function StorefrontLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { customer, token } = useSelector((s) => s.customer);
  const cartItems = useSelector((s) => s.cart.items);
  const wishlistItems = useSelector((s) => s.wishlist.items);

  const { isDark, toggle: toggleTheme } = useTheme();

  // Track page scroll to toggle header background glassmorphism
  const handleLogout = () => {
    dispatch(customerLogout());
    navigate("/");
  };

  // Close mobile menu on route change

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  return (
    <div className="min-h-screen w-full store-bg flex flex-col transition-colors duration-300">
      {/* Top Promotional Banner */}
      {/* <div className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs py-2 px-4 text-center font-medium tracking-wide">
        FREE SHIPPING ON ORDERS OVER ₹999 & COMPLIMENTARY TRIAL GIFTS IN EVERY ORDER!
      </div> */}

      {/* Main Glassmorphic Header */}
      <StoreHeader
        // scrolled={scrolled}
        location={location}
        toggleTheme={toggleTheme}
        isDark={isDark}
        wishlistCount={wishlistCount}
        cartCount={cartCount}
        token={token}
        customer={customer}
        handleLogout={handleLogout}
      />

      {/* Main Page Layout Wrapper */}
      <main className="flex-1 w-full max-w-[1400px] mt-5 p-2 relative">
        <Outlet />
      </main>

      {/* Modern High-End Footer */}
      <StoreFooter />
    </div>
  );
}
