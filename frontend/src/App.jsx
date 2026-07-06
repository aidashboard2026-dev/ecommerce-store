import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { fetchMeThunk } from '@/admin/store/authSlice'
import { fetchCustomerMeThunk } from '@/storefront/store/customerSlice'
import AppRoutes from '@/shared/routes/AppRoutes'
import useStoreSettings from '@/shared/hooks/useStoreSettings'


function App() {
  const dispatch           = useDispatch()
  const token              = useSelector((s) => s.auth.token)
  const initialized        = useSelector((s) => s.auth.initialized)
  const customerToken      = useSelector((s) => s.customer.token)
  const customerInitialized = useSelector((s) => s.customer.initialized)
  
  const { settings } = useStoreSettings()

  useEffect(() => {
    if (settings) {
      if (settings.store_name) {
        document.title = settings.store_name
        localStorage.setItem('store_name', settings.store_name)
      }
      if (settings.logo) {
        const link = document.querySelector("link[rel~='icon']")
        if (link) {
          link.href = settings.logo
        }
        localStorage.setItem('store_logo', settings.logo)
      }
      if (settings.currency) {
        localStorage.setItem('store_currency', settings.currency)
      }
      if (settings.support_email) {
        localStorage.setItem('store_email', settings.support_email)
      }
      if (settings.support_phone) {
        localStorage.setItem('store_phone', settings.support_phone)
      }
      if (settings.country) {
        localStorage.setItem('store_country', settings.country)
      }
      if (settings.store_url) {
        localStorage.setItem('store_url', settings.store_url)
      }
    }
  }, [settings])

  useEffect(() => {
    if (token) {
      dispatch(fetchMeThunk())
    }
  }, [token, dispatch])

  useEffect(() => {
    if (customerToken) {
      dispatch(fetchCustomerMeThunk())
    }
  }, [customerToken, dispatch])

  if (!initialized || !customerInitialized) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-muted text-sm font-medium">Loading AuraStore...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            fontSize: '12.5px',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          },
        }}
      />
    </BrowserRouter>
  )
}

export default App