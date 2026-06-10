import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMeThunk } from './store/authSlice'
import AppRoutes from './routes/AppRoutes'

function App() {
  const dispatch = useDispatch()
  const token = useSelector((s) => s.auth.token)
  const admin = useSelector((s) => s.auth.admin)
  const initialized = useSelector((s) => s.auth.initialized)

  useEffect(() => {
    if (token) {
      dispatch(fetchMeThunk())
    }
  }, [token, dispatch])

  if (token && !initialized && !admin) {
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
    </BrowserRouter>
  )
}

export default App
