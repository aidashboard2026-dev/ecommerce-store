import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loginThunk, clearError } from '@/admin/store/authSlice'
import { useTheme } from '@/shared/hooks/useAuth'
import { Eye, EyeOff, Zap, Sun, Moon } from 'lucide-react'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import { Card, CardContent } from '@/shared/components/ui/Card'

export default function LoginPage() {
  const dispatch = useDispatch()
  const { loading, error } = useSelector((s) => s.auth)
  const { isDark, toggle } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  
  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = await dispatch(
      loginThunk({
        email,
        password,
      })
    )

    if (loginThunk.fulfilled.match(result)) {
      window.location.href = '/admin'
    }
    console.log("RESULT =", result)

    

    console.log("BEFORE REDIRECT")


    console.log("AFTER REDIRECT")
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-400/5 blur-3xl" />
      </div>

      {/* Theme Toggle */}
      <button
        id="theme-toggle"
        onClick={toggle}
        className="absolute top-5 right-5 w-8.5 h-8.5 rounded-xl bg-surface border border-app flex items-center justify-center text-muted hover:text-app transition-all shadow-sm active:scale-95"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <div className="w-full max-w-[380px] relative animate-slide-up space-y-6">
        {/* Logo Header */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow mb-4">
            <Zap size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-bold text-xl text-app tracking-tight">
            Admin<span className="text-brand-500">Dash</span>
          </h1>
          <p className="text-muted text-xs mt-1">Enterprise eCommerce Administration Portal</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <form id="admin-login-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  id="login-error-banner"
                  className="bg-red-500/5 border border-red-500/10 text-red-500 text-xs px-3.5 py-2.5 rounded-lg animate-fade-in font-medium"
                >
                  {error}
                </div>
              )}

              <Input
                id="admin-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mail.com"
                required
                autoComplete="email"
              />

              <Input
                id="admin-password"
                label="Password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="text-muted hover:text-app transition-colors p-0.5"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              <Button
                id="admin-login-submit"
                type="submit"
                loading={loading}
                className="w-full mt-2"
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/*
          SECURITY: No account creation prompt.
          Admin accounts are provisioned via seeding or by an existing superadmin only.
          Public registration for admin roles is intentionally disabled.
        */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted">
            Need administrative access?{' '}
            <span className="text-muted/80 font-medium">Contact the system administrator.</span>
          </p>
          <p className="text-[10px] text-muted/60">
            Protected by secure JWT session controls
          </p>
        </div>
      </div>
    </div>
  )
}