import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { fetchMeThunk } from './store/authSlice'
import { fetchCustomerMeThunk } from './store/customerSlice'
import AppRoutes from './routes/AppRoutes'


function App() {
  const dispatch      = useDispatch()
  const token         = useSelector((s) => s.auth.token)
  const initialized   = useSelector((s) => s.auth.initialized)
  const customerToken = useSelector((s) => s.customer.token)

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

  if (!initialized) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-muted text-sm font-medium">Loading AdminDash Pro...</p>
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