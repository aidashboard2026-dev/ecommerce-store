import React, { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { KeyRound, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { customerAuthAPI } from '@/shared/services/api'
import LoginForm from '@/storefront/components/auth/LoginForm'
import RegisterForm from '@/storefront/components/auth/RegisterForm'

// ── Forgot Password ───────────────────────────────────────────────────────────

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      await customerAuthAPI.forgotPassword(email)
      // Always show success — the backend never reveals whether the email exists
      setStatus('success')
    } catch (err) {
      // Network error or server error — actual 200 responses always succeed above
      setErrorMsg(
        err?.response?.data?.detail ||
        'Something went wrong. Please try again.'
      )
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={22} className="text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-display font-bold text-2xl text-app mb-2">Check your inbox</h1>
          <p className="text-sm text-muted mb-6">
            If an account with <strong className="text-app">{email}</strong> exists, we've sent a
            password-reset link. Check your spam folder if you don't see it within a few minutes.
          </p>
          <Link
            to="/auth/login"
            className="text-sm text-brand-500 font-semibold hover:text-brand-600"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark">
        <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
          <KeyRound size={20} className="text-brand-500" />
        </div>
        <h1 className="font-display font-bold text-2xl text-app text-center mb-1">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors mt-2"
          >
            {status === 'loading' ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Remember your password?{' '}
          <Link to="/auth/login" className="text-brand-500 font-semibold hover:text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

// ── Route dispatcher ──────────────────────────────────────────────────────────

function viewFromPath(pathname) {
  if (pathname.endsWith('/forgot-password')) return 'forgot'
  if (pathname.endsWith('/register') || pathname.endsWith('/signup')) return 'register'
  return 'login'
}

export default function AuthPage() {
  const location = useLocation()
  const view = viewFromPath(location.pathname)

  if (view === 'register') return <RegisterForm />
  if (view === 'forgot')   return <ForgotPasswordForm />
  return <LoginForm />
}
