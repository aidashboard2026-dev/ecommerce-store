import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { fetchMeThunk } from './store/authSlice'
import AppRoutes from './routes/AppRoutes'

function App() {
  const dispatch     = useDispatch()
  const token        = useSelector((s) => s.auth.token)
  const initialized  = useSelector((s) => s.auth.initialized)

  useEffect(() => {
    // token is now rehydrated from localStorage at boot, so this fires
    // on first render when a persisted session exists.
    if (token) {
      dispatch(fetchMeThunk())
    }
  }, [token, dispatch])

  // Block rendering until session validation completes.
  // initialized starts true  → no token at boot, nothing to fetch, render immediately.
  // initialized starts false → token exists, fetchMeThunk in flight, show spinner.
  // fetchMeThunk resolves    → initialized flips to true, routes render.
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
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App