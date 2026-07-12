import React, {
  Suspense,
  useCallback,
  createContext,
  useContext,
  useState,
} from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import { useTheme } from "@/shared/hooks/useAuth";
import { customerLogoutThunk } from "@/storefront/store/customerSlice";

import StoreHeader from "@/storefront/components/storeindex/StoreHeader";
import StoreFooter from "@/storefront/components/storeindex/StoreFooter";
import CartDrawer from "@/storefront/components/shoppingcart/CartDrawer";
import GuestAuthModal from "@/storefront/components/checkout/GuestAuthModal";
import { clearCart } from "@/storefront/store/cartSlice";

import { clearWishlist } from "@/storefront/store/wishlistSlice";

export const CheckoutAuthModalContext = createContext(null);

export function useCheckoutAuthModal() {
  return useContext(CheckoutAuthModalContext);
}

export default function StorefrontLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { customer, token } = useSelector((s) => s.customer);
  const cartItems = useSelector((s) => s.cart.items);
  const wishlistItems = useSelector((s) => s.wishlist.items);

  const { isDark, toggle: toggleTheme } = useTheme();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTrigger, setModalTrigger] = useState(null);

  const openCheckoutAuthModal = useCallback((triggerEl) => {
    setModalTrigger(triggerEl);
    setModalOpen(true);
  }, []);

  const closeCheckoutAuthModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // Track page scroll to toggle header background glassmorphism
  const handleLogout = async () => {
    try {
      await dispatch(customerLogoutThunk()).unwrap();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      // Clear Redux cart/wishlist UI
      dispatch(clearCart());
      dispatch(clearWishlist());

      // Clear browser authentication data
      localStorage.removeItem("customer_token");

      localStorage.removeItem("customer");

      localStorage.removeItem("aurastore_cart");

      localStorage.removeItem("aurastore_wishlist");

      sessionStorage.removeItem("aurastore_guest_added_toast_shown");

      navigate("/");
    }
  };

  // Close mobile menu on route change

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  return (
    <CheckoutAuthModalContext.Provider
      value={{ openCheckoutAuthModal, closeCheckoutAuthModal }}
    >
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
        <main className="flex-1 w-full mt-5 p-2 relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-gray-500 text-lg">Loading...</div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        <CartDrawer />

        <StoreFooter />

        <GuestAuthModal
          isOpen={modalOpen}
          onClose={closeCheckoutAuthModal}
          triggerElement={modalTrigger}
        />
      </div>
    </CheckoutAuthModalContext.Provider>
  );
}
