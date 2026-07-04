import React, { useEffect, useMemo, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

// Admin Layout & Pages
import { logoutThunk } from "@/admin/store/authSlice";
import MainLayout from "@/admin/layouts/MainLayout";

// Storefront Layout
import StorefrontLayout from "@/storefront/layouts/StorefrontLayout";
import OrderSuccess from "@/storefront/components/checkout/OrderSuccess";
import ReturnsPolicy from "@/storefront/pages/ReturnsPolicy";
// import OrderTimelinePage from "@/storefront/components/order/components/OrderTimeline";

// Lazy loaded pages/components to optimize bundle sizes
const AdminLoginPage = lazy(() => import("@/admin/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/admin/pages/DashboardPage"));
const AdminProductsPage = lazy(() => import("@/admin/pages/ProductsPage"));
const CategoriesPage = lazy(() => import("@/admin/pages/CategoriesPage"));
const AdminOrdersPage = lazy(() => import("@/admin/pages/OrdersPage"));
const OffersPage = lazy(() => import("@/admin/pages/OffersPage"));
const CustomersPage = lazy(() => import("@/admin/pages/CustomersPage"));
const SettingsPage = lazy(() => import("@/admin/pages/SettingsPage"));
const BannerPage = lazy(() => import("@/admin/pages/BannerPage"));
const CustomProductsPage = lazy(
  () => import("@/admin/pages/CustomProductsPage"),
);

// Storefront Pages
const HomePage = lazy(() => import("@/storefront/pages/HomePage"));
const ProductsPage = lazy(() => import("@/storefront/pages/ProductsPage"));
const CartPage = lazy(() => import("@/storefront/pages/CartPage"));
const OrdersPage = lazy(() => import("@/storefront/pages/OrdersPage"));
const ProfilePage = lazy(() => import("@/storefront/pages/ProfilePage"));
const AuthPage = lazy(() => import("@/storefront/pages/AuthPage"));
const ResetPasswordPage = lazy(
  () => import("@/storefront/pages/ResetPasswordPage"),
);
const SupportPage = lazy(() => import("@/storefront/pages/SupportPage"));
const CustomPage = lazy(() => import("@/storefront/pages/CustomPage"));
const StorefrontOffersPage = lazy(
  () => import("@/storefront/pages/OffersPage"),
);
const NotFoundPage = lazy(() => import("@/storefront/pages/NotFoundPage"));

// Storefront components used directly as route elements
const CheckoutPage = lazy(
  () => import("@/storefront/components/checkout/CheckoutPage"),
);
const WishlistGrid = lazy(() => import("@/storefront/components/WishlistGrid"));
const ProductDetailsPage = lazy(
  () => import("@/storefront/pages/CustomProductDetailsPage"),
);

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-app">
    <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── ADMIN AUTH STATE ──────────────────────────────────────────────────────────
function useAdminAuthState() {
  const isAuthenticated = useSelector(
    (state) => !!state.auth.admin
  );

  const initialized = useSelector(
    (state) => state.auth.initialized
  );

  return {
    isAuthenticated,
    initialized,
  };
}

function AdminProtectedRoute({ children }) {
  const { isAuthenticated, initialized } = useAdminAuthState();

  if (!initialized) return <Spinner />;

  return isAuthenticated ? children : <Navigate to="/admin/login" replace />;
}

function AdminPublicRoute({ children }) {
  const { isAuthenticated, initialized } = useAdminAuthState();

  if (!initialized) return <Spinner />;

  return isAuthenticated ? <Navigate to="/admin" replace /> : children;
}

// ── CUSTOMER AUTH STATE ──────────────────────────────────────────────────────
function CustomerProtectedRoute({ children }) {
  const { token, customer } = useSelector((s) => s.customer);

  return token && customer ? children : <Navigate to="/auth/login" replace />;
}

function CustomerPublicRoute({ children }) {
  const { token, customer } = useSelector((s) => s.customer);

  return token && customer ? <Navigate to="/profile" replace /> : children;
}

// Helper component to redirect legacy category URLs to storefront catalog search
function CategoryRedirect() {
  const { slug } = useParams();
  const normalizedCategory = useMemo(() => {
    if (!slug) return "";
    // Map legacy URL slugs to canonical category slugs (must match Category.slug in DB)
    const mapping = {
      "t-shirt": "t-shirt",
      "track-pant": "track-pant",
      "jersey": "jersey",
      "shirt": "shirt",
      "trouser": "trouser",
      "t-shirts": "t-shirt",
      "track-pants": "track-pant",
      "jerseys": "jersey",
      "shirts": "shirt",
      "trousers": "trouser",
    };
    return mapping[slug.toLowerCase()] || slug.toLowerCase();
  }, [slug]);

  return (
    <Navigate
      to={`/products?category=${encodeURIComponent(normalizedCategory)}`}
      replace
    />
  );
}

import { customerLogout } from "@/storefront/store/customerSlice";

export default function AppRoutes() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Admin unauthorized/session expiration handler
  useEffect(() => {
    const handle = () => {
      dispatch(logoutThunk());
      navigate("/admin/login", { replace: true });
    };

    window.addEventListener("auth:unauthorized", handle);

    return () => {
      window.removeEventListener("auth:unauthorized", handle);
    };
  }, [dispatch, navigate]);

  // Customer unauthorized/session expiration handler
  useEffect(() => {
    const handle = () => {
      dispatch(customerLogout());
      navigate("/auth/login", { replace: true });
    };

    window.addEventListener("customer:unauthorized", handle);

    return () => {
      window.removeEventListener("customer:unauthorized", handle);
    };
  }, [dispatch, navigate]);

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* ── BACKWARD COMPATIBILITY REDIRECTS ─────────────────────────────── */}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />

        <Route
          path="/signup"
          element={<Navigate to="/admin/signup" replace />}
        />

        {/* ── ADMIN AUTH ROUTES (structure unchanged) ───────────────────────── */}
        <Route
          path="/admin/login"
          element={
            <AdminPublicRoute>
              <AdminLoginPage />
            </AdminPublicRoute>
          }
        />

        {/* ── ADMIN DASHBOARD (structure unchanged) ──────────────────────────── */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <MainLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductsPage />} />
          <Route path="products/:id/edit" element={<AdminProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="categories/new" element={<CategoriesPage />} />
          {/* Collections — no dedicated page yet; redirect to categories */}
          <Route path="collections" element={<Navigate to="/admin/categories" replace />} />
          <Route path="collections/new" element={<Navigate to="/admin/categories" replace />} />
          {/* Inventory — filter view of products */}
          <Route path="inventory" element={<AdminProductsPage />} />
          {/* Analytics — order analytics view */}
          <Route path="analytics" element={<AdminOrdersPage />} />
          {/* Reports */}
          <Route path="reports" element={<AdminOrdersPage />} />
          <Route path="reports/sales" element={<AdminOrdersPage />} />
          {/* Reviews — no dedicated page; redirect to customers */}
          <Route path="reviews" element={<Navigate to="/admin/customers" replace />} />
          <Route path="reviews/:id" element={<Navigate to="/admin/customers" replace />} />
          {/* Payments — redirect to orders */}
          <Route path="payments" element={<Navigate to="/admin/orders" replace />} />
          <Route path="payments/:id" element={<Navigate to="/admin/orders" replace />} />
          <Route path="custom-products" element={<CustomProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrdersPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="offers/new" element={<OffersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/new" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="banners" element={<BannerPage />} />
        </Route>

        {/* ── STOREFRONT ROUTES ───────────────────────────────────────────── */}
        <Route path="/" element={<StorefrontLayout />}>
          <Route index element={<HomePage />} />

          {/* Products — list (/products) and details (/products/:slug) share
              a single consolidated page component */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:slug" element={<ProductsPage />} />

          <Route path="returns-policy" element={<ReturnsPolicy />} />
          <Route path="order-success" element={<OrderSuccess />} />
          {/* <Route path="ordertimeline" element={<OrderTimelinePage />} /> */}
          <Route
            path="sub-products"
            element={<Navigate to="/products" replace />}
          />
          <Route path="category/:slug" element={<CategoryRedirect />} />

          <Route path="cart" element={<CartPage />} />

          {/* Custom orders (new) */}
          <Route path="custom" element={<CustomPage />} />
          <Route path="custom/:productType" element={<CustomPage />} />
          <Route path="offers" element={<StorefrontOffersPage />} />

          {/* Support / info (new) */}
          <Route path="support" element={<SupportPage />} />
          <Route path="support/faq" element={<SupportPage />} />
          <Route path="support/about" element={<SupportPage />} />
          <Route path="support/privacy" element={<SupportPage />} />
          <Route path="support/terms" element={<SupportPage />} />
          <Route path="support/returns" element={<SupportPage />} />

          {/* Orders, success/payment, and tracking — all consolidated into
              one page component that dispatches internally on the route */}
          <Route path="tracking" element={<OrdersPage />} />
          <Route path="wishlist" element={<WishlistGrid />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          {/* Customer Auth — login/register/forgot-password consolidated;
              /auth/signup kept as a legacy alias for /auth/register */}
          <Route
            path="auth/login"
            element={
              <CustomerPublicRoute>
                <AuthPage />
              </CustomerPublicRoute>
            }
          />

          <Route
            path="auth/register"
            element={
              <CustomerPublicRoute>
                <AuthPage />
              </CustomerPublicRoute>
            }
          />

          <Route
            path="auth/signup"
            element={
              <CustomerPublicRoute>
                <AuthPage />
              </CustomerPublicRoute>
            }
          />

          <Route
            path="auth/forgot-password"
            element={
              <CustomerPublicRoute>
                <AuthPage />
              </CustomerPublicRoute>
            }
          />

          <Route path="auth/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Customer Routes */}
          <Route path="checkout" element={<CheckoutPage />} />

          <Route
            path="payment"
            element={
              <CustomerProtectedRoute>
                <OrdersPage />
              </CustomerProtectedRoute>
            }
          />

          {/* Profile — profile / orders / addresses / wishlist / settings tabs
              are all handled internally by ProfilePage */}
          <Route
            path="profile"
            element={
              <CustomerProtectedRoute>
                <ProfilePage />
              </CustomerProtectedRoute>
            }
          />

          <Route
            path="profile/orders"
            element={
              <CustomerProtectedRoute>
                <ProfilePage />
              </CustomerProtectedRoute>
            }
          />

          <Route
            path="profile/addresses"
            element={
              <CustomerProtectedRoute>
                <ProfilePage />
              </CustomerProtectedRoute>
            }
          />

          <Route
            path="profile/wishlist"
            element={
              <CustomerProtectedRoute>
                <ProfilePage />
              </CustomerProtectedRoute>
            }
          />

          <Route
            path="profile/settings"
            element={
              <CustomerProtectedRoute>
                <ProfilePage />
              </CustomerProtectedRoute>
            }
          />

          {/* Orders list / details / success / per-order tracking — all one
              consolidated page component (see OrdersPage internals) */}
          <Route
            path="orders"
            element={
              <CustomerProtectedRoute>
                <OrdersPage />
              </CustomerProtectedRoute>
            }
          />

          <Route
            path="orders/success"
            element={
              <CustomerProtectedRoute>
                <OrdersPage />
              </CustomerProtectedRoute>
            }
          />

          <Route
            path="orders/:id"
            element={
              <CustomerProtectedRoute>
                <OrdersPage />
              </CustomerProtectedRoute>
            }
          />

          <Route
            path="orders/:id/tracking"
            element={
              <CustomerProtectedRoute>
                <OrdersPage />
              </CustomerProtectedRoute>
            }
          />

          {/* Storefront 404 — rendered inside the StorefrontLayout shell so
              unmatched paths still get the site header/footer. (Previously
              any unmatched path silently redirected to "/"; seeing an actual
              not-found page here is the one intentional behavior change in
              this refactor — see summary.) */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}