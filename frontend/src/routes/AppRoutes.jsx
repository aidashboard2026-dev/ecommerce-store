import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/AdminPage/LoginPage'
import DashboardPage from '../pages/AdminPage/DashboardPage'
import ProductsPage from '../pages/AdminPage/ProductsPage'
import OrdersPage from '../pages/AdminPage/OrdersPage'
import OffersPage from '../pages/AdminPage/OffersPage'
import CustomersPage from '../pages/AdminPage/CustomersPage'
import SettingsPage from '../pages/AdminPage/SettingsPage'
import AddOfferPage from "../pages/AdminPage/AddOfferPage";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="add-offer" element={<AddOfferPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
