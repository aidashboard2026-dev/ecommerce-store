import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loginThunk, clearError } from '../../store/authSlice'
import { useTheme } from '../../hooks/useAuth'
import { Eye, EyeOff, Zap, Sun, Moon } from 'lucide-react'
import useStoreSettings from '@/shared/hooks/useStoreSettings'

export default function LoginPage() {
  const dispatch = useDispatch()
  const { loading, error } = useSelector((s) => s.auth)
  const { isDark, toggle } = useTheme()
  const { settings } = useStoreSettings()

  const logoUrl = settings?.logo
  const storeName = import.meta.env.VITE_STORE_NAME || 'My Designers'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  
  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()

    await dispatch(
      loginThunk({
        email,
        password,
      })
    )

    if (import.meta.env.DEV) console.log("RESULT =", result)

    

    if (import.meta.env.DEV) console.log("BEFORE REDIRECT")


    if (import.meta.env.DEV) console.log("AFTER REDIRECT")
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-400/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-brand-600/5 blur-2xl" />
      </div>

      {/* Theme toggle top-right */}
      <button
        onClick={toggle}
        className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-surface border border-app flex items-center justify-center text-muted hover:text-app transition-all"
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div className="w-full max-w-[400px] relative animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${storeName} Logo`}
              className="w-14 h-14 rounded-2xl object-cover shadow-glow mb-4"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow mb-4">
              <Zap size={24} className="text-white" strokeWidth={2.5} />
            </div>
          )}
          <h1 className="font-display font-bold text-2xl text-app tracking-tight text-center">
            {storeName}
          </h1>
          <p className="text-muted text-sm mt-1">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-app">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mail.com"
                className="input-field"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-app">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors"
                >
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-5">
          Protected by JWT Authentication Â· AdminDash Pro
        </p>
      </div>
    </div>
  )
}
