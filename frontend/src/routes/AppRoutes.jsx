import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
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

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-app">
    <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

function useAuthState() {
  return useSelector((s) => ({
    isAuthenticated: !!s.auth.admin,
    initialized: s.auth.initialized,
  }))
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, initialized } = useAuthState()
  if (!initialized) return <Spinner />
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated, initialized } = useAuthState()
  if (!initialized) return <Spinner />
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

export default function AppRoutes() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    const handle = () => {
      dispatch(logoutThunk())
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:unauthorized', handle)
    return () => window.removeEventListener('auth:unauthorized', handle)
  }, [navigate, dispatch])

  return (
    <Routes>
      <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="products"  element={<ProductsPage />} />
        <Route path="orders"    element={<OrdersPage />} />
        <Route path="offers"    element={<OffersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="settings"  element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}