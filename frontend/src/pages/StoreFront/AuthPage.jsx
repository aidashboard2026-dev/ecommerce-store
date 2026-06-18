import React from 'react'
import { useLocation } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import LoginForm from '../../components/storefront/LoginForm'
import RegisterForm from '../../components/storefront/RegisterForm'

// Placeholder section for /auth/forgot-password. The backend does not yet
// expose a password-reset endpoint, so — consistent with the rest of the
// app's pattern of surfacing not-yet-available account actions (see the
// "Password" notice in ProfilePage) — this simply points the customer to
// support rather than fabricating a reset flow that isn't wired to anything.
function ForgotPasswordNotice() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark text-center">
        <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
          <KeyRound size={20} className="text-muted" />
        </div>
        <h1 className="font-display font-bold text-2xl text-app mb-1">Reset Password</h1>
        <p className="text-sm text-muted">
          Self-service password reset isn't available yet. Contact support and we'll help you
          regain access to your account.
        </p>
      </div>
    </div>
  )
}

function viewFromPath(pathname) {
  if (pathname.endsWith('/forgot-password')) return 'forgot'
  if (pathname.endsWith('/register') || pathname.endsWith('/signup')) return 'register'
  return 'login'
}

// Consolidated storefront auth page.
//
// Supports /auth/login, /auth/register, and /auth/forgot-password via
// internal conditional rendering. /auth/signup is preserved as a legacy
// alias for /auth/register so existing links/bookmarks keep working.
export default function AuthPage() {
  const location = useLocation()
  const view = viewFromPath(location.pathname)

  if (view === 'register') return <RegisterForm />
  if (view === 'forgot') return <ForgotPasswordNotice />
  return <LoginForm />
}
