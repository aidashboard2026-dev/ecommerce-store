import React, { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound } from 'lucide-react'
import { resetPassword } from '@/firebase/auth'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const actionCode = searchParams.get('oobCode') || searchParams.get('token') || ''

  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPwd, setShowPwd]           = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [status, setStatus]             = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg]         = useState('')

  // If there's no token at all, show an immediate error state
  const hasToken = !!actionCode

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }

    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setStatus('loading')

    try {
      await resetPassword(actionCode, password)
      setStatus('success')
    } catch (err) {
      const detail = err?.message
      setErrorMsg(detail || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  // Success state — redirect to login after 3 s
  useEffect(() => {
    if (status !== 'success') return
    const t = setTimeout(() => navigate('/auth/login'), 3000)
    return () => clearTimeout(t)
  }, [status, navigate])

  // ── No token in URL ─────────────────────────────────────────────────────────
  if (!hasToken) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-app mb-2">Invalid link</h1>
          <p className="text-sm text-muted mb-6">
            This password-reset link is missing its token. Please request a new one.
          </p>
          <Link
            to="/auth/forgot-password"
            className="text-sm text-brand-500 font-semibold hover:text-brand-600"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={22} className="text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-display font-bold text-2xl text-app mb-2">Password updated!</h1>
          <p className="text-sm text-muted mb-6">
            Your password has been changed. Redirecting you to sign in…
          </p>
          <Link
            to="/auth/login"
            className="text-sm text-brand-500 font-semibold hover:text-brand-600"
          >
            Sign in now
          </Link>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark">
        <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
          <KeyRound size={20} className="text-brand-500" />
        </div>
        <h1 className="font-display font-bold text-2xl text-app text-center mb-1">
          Set a new password
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* New password */}
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type={showPwd ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-11 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-11 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Error message */}
          {errorMsg && (
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
            {status === 'loading' ? 'Updating password…' : 'Update password'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Link expired?{' '}
          <Link
            to="/auth/forgot-password"
            className="text-brand-500 font-semibold hover:text-brand-600"
          >
            Request a new one
          </Link>
        </p>
      </div>
    </div>
  )
}
