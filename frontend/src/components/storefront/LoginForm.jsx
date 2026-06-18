import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { customerLoginThunk, clearCustomerError } from '../../store/customerSlice'

export default function LoginForm() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, error } = useSelector((s) => s.customer)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearCustomerError())
    const result = await dispatch(customerLoginThunk({ email, password }))
    if (customerLoginThunk.fulfilled.match(result)) {
      toast.success('Welcome back!')
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark">
        <h1 className="font-display font-bold text-2xl text-app text-center mb-1">Welcome Back</h1>
        <p className="text-sm text-muted text-center mb-6">Sign in to continue shopping</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-11 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors mt-2"
          >
            <LogIn size={16} /> {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          New here?{' '}
          <Link to="/auth/register" className="text-brand-500 font-semibold hover:text-brand-600">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
