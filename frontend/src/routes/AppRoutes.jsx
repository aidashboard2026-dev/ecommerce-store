import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

// Admin Layout & Pages
import { logoutThunk } from '../store/authSlice'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/AdminPage/LoginPage'
import SignupPage from '../pages/AdminPage/SignupPage'
import DashboardPage from '../pages/AdminPage/DashboardPage'
import ProductsPage from '../pages/AdminPage/ProductsPage'
import OrdersPage from '../pages/AdminPage/OrdersPage'
import OffersPage from '../pages/AdminPage/OffersPage'
import CustomersPage from '../pages/AdminPage/CustomersPage'
import SettingsPage from '../pages/AdminPage/SettingsPage'
import BannerPage from '../pages/AdminPage/BannerPage'

// Storefront Layout & Pages
import StorefrontLayout from '../layouts/StorefrontLayout'
import HomePage from '../pages/StoreFront/HomePage'
import StorefrontProductsPage from '../pages/StoreFront/ProductsPage'
import ProductDetailsPage from '../pages/StoreFront/ProductDetailsPage'
import CartPage from '../pages/StoreFront/CartPage'
import CheckoutPage from '../pages/StoreFront/CheckoutPage'
import PaymentPage from '../pages/StoreFront/PaymentPage'
import TrackingPage from '../pages/StoreFront/TrackingPage'
import CustomerLoginPage from '../pages/StoreFront/CustomerLoginPage'
import CustomerSignupPage from '../pages/StoreFront/CustomerSignupPage'
import WishlistPage from '../pages/StoreFront/WishlistPage'
import CustomerProfilePage from '../pages/StoreFront/CustomerProfilePage'
import StorefrontOrdersPage from '../components/storefront/order/pages/OrdersPage'
import OrderDetailsPage from '../components/storefront/order/pages/OrderDetailsPage'

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

      {/* ── ADMIN AUTH ROUTES ───────────────────────────────────────────── */}
      <Route
        path="/admin/login"
        element={
          <AdminPublicRoute>
            <LoginPage />
          </AdminPublicRoute>
        }
      />

      <Route
        path="/admin/signup"
        element={
          <AdminPublicRoute>
            <SignupPage />
          </AdminPublicRoute>
        }
      />

      {/* ── ADMIN DASHBOARD ─────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <MainLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="banners" element={<BannerPage />} />
      </Route>

      {/* ── STOREFRONT ROUTES ───────────────────────────────────────────── */}
      <Route path="/" element={<StorefrontLayout />}>
        <Route index element={<HomePage />} />

        <Route
          path="products"
          element={<StorefrontProductsPage />}
        />

        <Route
          path="products/:slug"
          element={<ProductDetailsPage />}
        />

        <Route path="cart" element={<CartPage />} />
        <Route path="tracking" element={<TrackingPage />} />
        <Route path="wishlist" element={<WishlistPage />} />

        {/* Customer Auth */}
        <Route
          path="auth/login"
          element={
            <CustomerPublicRoute>
              <CustomerLoginPage />
            </CustomerPublicRoute>
          }
        />

        <Route
          path="auth/signup"
          element={
            <CustomerPublicRoute>
              <CustomerSignupPage />
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
              <PaymentPage />
            </CustomerProtectedRoute>
          }
        />

        <Route
          path="profile"
          element={
            <CustomerProtectedRoute>
              <CustomerProfilePage />
            </CustomerProtectedRoute>
          }
        />

        <Route
          path="profile/orders"
          element={
            <CustomerProtectedRoute>
              <CustomerProfilePage />
            </CustomerProtectedRoute>
          }
        />

        <Route
          path="orders"
          element={
            <CustomerProtectedRoute>
              <StorefrontOrdersPage />
            </CustomerProtectedRoute>
          }
        />

        <Route
          path="orders/:id"
          element={
            <CustomerProtectedRoute>
              <OrderDetailsPage />
            </CustomerProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}