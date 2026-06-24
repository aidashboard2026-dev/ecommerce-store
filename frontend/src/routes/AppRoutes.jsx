import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

// Admin Layout & Pages
import { logoutThunk } from '../store/authSlice'
import MainLayout from '../layouts/MainLayout'
import AdminLoginPage from '../pages/AdminPage/LoginPage'
// import AdminSignupPage from '../pages/AdminPage/SignupPage'
import DashboardPage from '../pages/AdminPage/DashboardPage'
import AdminProductsPage from '../pages/AdminPage/ProductsPage'
import AdminOrdersPage from '../pages/AdminPage/OrdersPage'
import OffersPage from '../pages/AdminPage/OffersPage'
import CustomersPage from '../pages/AdminPage/CustomersPage'
import SettingsPage from '../pages/AdminPage/SettingsPage'
import BannerPage from '../pages/AdminPage/BannerPage'

// Storefront Layout
import StorefrontLayout from '../layouts/StorefrontLayout'
import ProductDetailsPage from "../pages/CustomProductDetailsPage";

// Storefront Pages (consolidated — see /src/pages/storefront)
import HomePage from '../pages/storefront/HomePage'
import ProductsPage from '../pages/storefront/ProductsPage'
import CartPage from '../pages/storefront/CartPage'
import OrdersPage from '../pages/storefront/OrdersPage'
import ProfilePage from '../pages/storefront/ProfilePage'
import AuthPage from '../pages/storefront/AuthPage'
import SupportPage from '../pages/storefront/SupportPage'
import CustomPage from '../pages/storefront/CustomPage'
import NotFoundPage from '../pages/storefront/NotFoundPage'

// Storefront components used directly as route elements (no dedicated
// top-level page wrapper needed for these — see refactor notes)
import CheckoutPage from '../components/storefront/CheckoutPage'
import WishlistGrid from '../components/storefront/WishlistGrid'


import SubProductsPage from "../components/storefront/SubProductsPage";
// import CategoryPage from '../components/storefront/CategoryPage'
import CustomProductsPage from "../pages/AdminPage/CustomProductsPage";

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-app">
    <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

// ── ADMIN AUTH STATE ──────────────────────────────────────────────────────────
function useAdminAuthState() {
  return useSelector((s) => ({
    isAuthenticated: !!s.auth.admin,
    initialized: s.auth.initialized,
  }))
}

function AdminProtectedRoute({ children }) {
  const { isAuthenticated, initialized } = useAdminAuthState()

  if (!initialized) return <Spinner />

  return isAuthenticated
    ? children
    : <Navigate to="/admin/login" replace />
}

function AdminPublicRoute({ children }) {
  const { isAuthenticated, initialized } = useAdminAuthState()

  if (!initialized) return <Spinner />

  return isAuthenticated
    ? <Navigate to="/admin" replace />
    : children
}

// ── CUSTOMER AUTH STATE ──────────────────────────────────────────────────────
function CustomerProtectedRoute({ children }) {
  const { token, customer } = useSelector((s) => s.customer)

  return token && customer
    ? children
    : <Navigate to="/auth/login" replace />
}

function CustomerPublicRoute({ children }) {
  const { token, customer } = useSelector((s) => s.customer)

  return token && customer
    ? <Navigate to="/profile" replace />
    : children
}

export default function AppRoutes() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  // Admin unauthorized/session expiration handler
  useEffect(() => {
    const handle = () => {
      dispatch(logoutThunk())
      navigate('/admin/login', { replace: true })
    }

    window.addEventListener('auth:unauthorized', handle)

    return () => {
      window.removeEventListener('auth:unauthorized', handle)
    }
  }, [dispatch, navigate])

  return (
    <Routes>
      {/* ── BACKWARD COMPATIBILITY REDIRECTS ─────────────────────────────── */}
      <Route
        path="/login"
        element={<Navigate to="/admin/login" replace />}
      />

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

      {/* <Route
        path="/admin/signup"
        element={
          <AdminPublicRoute>
            <AdminSignupPage />
          </AdminPublicRoute>
        }
      /> */}
      
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
        <Route path="custom-products" element={<CustomProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="customers" element={<CustomersPage />} />
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


        <Route path="/sub-products" element={<SubProductsPage />} />
{/* 
        <Route path="category/:slug" element={<CategoryPage />} /> */}

        <Route path="cart" element={<CartPage />} />

        {/* Custom orders (new) */}
        <Route path="custom" element={<CustomPage />} />
        <Route path="custom/:productType" element={<CustomPage />} />

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

        <Route
          path="/product/:id"
          element={<ProductDetailsPage />}
        />

        {/* Storefront 404 — rendered inside the StorefrontLayout shell so
            unmatched paths still get the site header/footer. (Previously
            any unmatched path silently redirected to "/"; seeing an actual
            not-found page here is the one intentional behavior change in
            this refactor — see summary.) */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
