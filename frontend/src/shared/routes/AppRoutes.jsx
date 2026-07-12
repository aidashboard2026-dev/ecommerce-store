import React, { useEffect, useMemo, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

// Admin Layout & Pages
import { logoutThunk } from "@/admin/store/authSlice";
import MainLayout from "@/admin/layouts/MainLayout";

// Storefront Layout
import StorefrontLayout from "@/storefront/layouts/StorefrontLayout";
import ProductDetails from "@/storefront/components/product/ProductDetails";
import OrderSuccess from "@/storefront/components/checkout/OrderSuccess";
import AboutPage from "@/storefront/components/storefooter/about";
import ContactPage from "@/storefront/components/storefooter/contact";
import ShippingPage from "@/storefront/components/storefooter/ShippingPage";
import ReturnsPage from "@/storefront/components/storefooter/ReturnsPage";
import PrivacyPolicy from "@/storefront/components/storefooter/PrivacyPolicy";
import ReturnsPolicy from "@/storefront/pages/policys/ReturnsPolicy";
import TermsConditions from "@/storefront/components/storefooter/TermsConditions";

import EmailVerifiedPage from "@/storefront/pages/emailverified/EmailVerifiedPage";
// import OrderTimelinePage from "@/storefront/components/order/components/OrderTimeline";

// Lazy loaded pages/components to optimize bundle sizes
const AdminLoginPage = lazy(() => import("@/admin/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/admin/pages/DashboardPage"));
const AdminProductsPage = lazy(() => import("@/admin/pages/ProductsPage"));
const CategoriesPage = lazy(() => import("@/admin/pages/CategoriesPage"));
const AdminOrdersPage = lazy(() => import("@/admin/pages/OrdersPage"));
const OffersPage = lazy(() => import("@/admin/pages/OffersPage"));
const CustomersPage = lazy(() => import("@/admin/pages/CustomersPage"));
const ContactMessagesPage = lazy(
  () => import("@/admin/pages/ContactMessagesPage"),
);
const SettingsPage = lazy(() => import("@/admin/pages/SettingsPage"));
const BannerPage = lazy(() => import("@/admin/pages/BannerPage"));
const CustomProductsPage = lazy(
  () => import("@/admin/pages/CustomProductsPage"),
);

// Storefront Pages
const HomePage = lazy(() => import("@/storefront/pages/main/HomePage"));
const ProductsPage = lazy(() => import("@/storefront/pages/main/ProductsPage"));
const CartPage = lazy(() => import("@/storefront/pages/CartPage"));
const CheckoutPage = lazy(
  () => import("@/storefront/pages/ordercheckout/CheckoutPage"),
);
const OrdersPage = lazy(
  () => import("@/storefront/pages/ordercheckout/OrdersPage"),
);
const ProfilePage = lazy(() => import("@/storefront/pages/users/ProfilePage"));
const AuthPage = lazy(() => import("@/storefront/pages/users/AuthPage"));
const ResetPasswordPage = lazy(
  () => import("@/storefront/pages/users/ResetPasswordPage"),
);
const SupportPage = lazy(
  () => import("@/storefront/pages/policys/SupportPage"),
);
const CustomPage = lazy(() => import("@/storefront/pages/main/CustomPage"));
const StorefrontOffersPage = lazy(
  () => import("@/storefront/pages/main/OffersPage"),
);
const NotFoundPage = lazy(
  () => import("@/storefront/pages/empty/NotFoundPage"),
);
const WishlistGrid = lazy(() => import("@/storefront/pages/main/WishlistPage"));
const ProductDetailsPage = lazy(
  () =>
    import("@/storefront/components/Customproduct/CustomProductDetailsPage"),
);

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-app">
    <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── ADMIN AUTH STATE ──────────────────────────────────────────────────────────
function useAdminAuthState() {
  const isAuthenticated = useSelector((state) => !!state.auth.admin);

  const initialized = useSelector((state) => state.auth.initialized);

  return {
    isAuthenticated,
    initialized,
  };
}

function AdminProtectedRoute({ children }) {
  const { isAuthenticated, initialized } = useAdminAuthState();
  const location = useLocation();

  if (!initialized) return <Spinner />;

  if (isAuthenticated) {
    console.log(`[Auth Isolation: Admin Guard] Allowing access to protected admin route: ${location.pathname}`);
    return children;
  }

  console.log(`[Auth Isolation: Admin Guard] Access denied to ${location.pathname}. Redirecting to login.`);
  return <Navigate to="/auth/login" replace />;
}

function AdminPublicRoute({ children }) {
  const { isAuthenticated, initialized } = useAdminAuthState();
  const location = useLocation();

  if (!initialized) return <Spinner />;

  if (isAuthenticated) {
    console.log(`[Auth Isolation: Admin Public Guard] Redirecting to admin dashboard from public admin route: ${location.pathname}`);
    return <Navigate to="/admin/dashboard" replace />;
  }

  console.log(`[Auth Isolation: Admin Public Guard] Allowing access to admin public route: ${location.pathname}`);
  return children;
}

// ── Unified Public Route ─────────────────────────────────────────────────────
function UnifiedPublicRoute({ children }) {
  const { token: customerToken, customer } = useSelector((state) => state.customer);
  const location = useLocation();

  if (customerToken && customer) {
    console.log(`[Auth Isolation: Public Route Guard] Redirecting to storefront home because customer session is active for route: ${location.pathname}`);
    return <Navigate to="/" replace />;
  }

  console.log(`[Auth Isolation: Public Route Guard] Allowing access to public auth page: ${location.pathname}`);
  return children;
}

// ── CUSTOMER AUTH STATE ──────────────────────────────────────────────────────
function CustomerProtectedRoute({ children }) {
  const { token, customer } = useSelector((s) => s.customer);
  const cartItems = useSelector((s) => s.cart?.items || []);
  const location = useLocation();

  if (token && customer) {
    console.log(`[Auth Isolation: Customer Guard] Allowing access to protected customer route: ${location.pathname}`);
    return children;
  }

  // Allow guest checkout if cart is not empty
  if (location.pathname === "/checkout" && cartItems.length > 0) {
    console.log("[Auth Isolation: Customer Guard] Allowing guest checkout access.");
    return children;
  }

  console.log(`[Auth Isolation: Customer Guard] Access denied to ${location.pathname}. Redirecting to customer login.`);
  return <Navigate to="/auth/login" replace state={{ from: location }} />;
}

function NavigateToCustomerAuth({ target }) {
  const location = useLocation();
  return <Navigate to={target} replace state={location.state} />;
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
      jersey: "jersey",
      shirt: "shirt",
      trouser: "trouser",
      "t-shirts": "t-shirt",
      "track-pants": "track-pant",
      jerseys: "jersey",
      shirts: "shirt",
      trousers: "trouser",
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
      if (window.location.pathname.startsWith("/admin")) {
        navigate("/auth/login", { replace: true });
      }
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
      const isProtectedRoute = ["/profile", "/checkout", "/payment", "/orders"].some(
        (path) => window.location.pathname.startsWith(path)
      );
      if (isProtectedRoute) {
        navigate("/auth/login", { replace: true });
      }
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
        <Route
          path="/login"
          element={<NavigateToCustomerAuth target="/auth/login" />}
        />
        <Route
          path="/register"
          element={<NavigateToCustomerAuth target="/auth/register" />}
        />
        <Route
          path="/signup"
          element={<NavigateToCustomerAuth target="/auth/register" />}
        />

        {/* ── ADMIN AUTH ROUTES (structure unchanged) ───────────────────────── */}
        <Route
          path="/admin/login"
          element={<Navigate to="/auth/login" replace />}
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
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductsPage />} />
          <Route path="products/:id/edit" element={<AdminProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="custom-products" element={<CustomProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrdersPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="offers/new" element={<OffersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/new" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomersPage />} />
          <Route path="contact" element={<ContactMessagesPage />} />
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
          {/* <Route path="about" element={<AboutPage />} />   */}

          {/* <Route path="returns-policy" element={<ReturnsPolicy />} /> */}
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
          <Route path="custom-products" element={<CustomPage />} />
          <Route path="custom-products/:productType" element={<CustomPage />} />
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
          <Route path="track-order" element={<OrdersPage />} />
          {/* <Route path="contact" element={<SupportPage />} /> */}

          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route
            path="/terms-conditions"
            element={<TermsConditions />}
          />
          <Route path="wishlist" element={<WishlistGrid />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          {/* Customer Auth — login/register/forgot-password consolidated;
              /auth/signup kept as a legacy alias for /auth/register */}
          <Route
            path="auth/login"
            element={
              <UnifiedPublicRoute>
                <AuthPage />
              </UnifiedPublicRoute>
            }
          />

          <Route
            path="auth/register"
            element={
              <UnifiedPublicRoute>
                <AuthPage />
              </UnifiedPublicRoute>
            }
          />

          <Route
            path="auth/signup"
            element={
              <UnifiedPublicRoute>
                <AuthPage />
              </UnifiedPublicRoute>
            }
          />

          <Route
            path="auth/forgot-password"
            element={
              <UnifiedPublicRoute>
                <AuthPage />
              </UnifiedPublicRoute>
            }
          />

          <Route path="/auth/email-verified" element={<EmailVerifiedPage />} />

          <Route path="auth/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Customer Routes */}
          <Route
            path="checkout"
            element={
              <CustomerProtectedRoute>
                <CheckoutPage />
              </CustomerProtectedRoute>
            }
          />

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
