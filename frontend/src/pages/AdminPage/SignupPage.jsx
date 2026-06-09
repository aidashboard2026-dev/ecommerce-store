import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
  Eye, EyeOff, Zap, Sun, Moon, ArrowRight,
  User, Mail, Lock, Phone, Calendar, ShieldCheck, Check,
} from 'lucide-react'
import { signupThunk } from '../../store/authSlice'
import { useTheme } from '../../hooks/useAuth'

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let s = 0
  if (pwd.length >= 8)           s++
  if (pwd.length >= 12)          s++
  if (/[A-Z]/.test(pwd))         s++
  if (/[0-9]/.test(pwd))         s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  const map = [
    { label: '',          color: '' },
    { label: 'Weak',      color: 'bg-red-500' },
    { label: 'Fair',      color: 'bg-orange-400' },
    { label: 'Good',      color: 'bg-yellow-400' },
    { label: 'Strong',    color: 'bg-brand-400' },
    { label: 'Excellent', color: 'bg-green-500' },
  ]
  return { score: s, ...map[s] }
}

function StrengthBar({ password }) {
  const { score, label, color } = getStrength(password)
  if (!password) return null
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? color : 'bg-app-border'
            }`}
          />
        ))}
      </div>
      {label && (
        <p className={`text-xs font-medium ${
          score <= 1 ? 'text-red-500' :
          score === 2 ? 'text-orange-400' :
          score === 3 ? 'text-yellow-500' : 'text-green-500'
        }`}>{label} password</p>
      )}
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

const validate = {
  firstName: (v) => !v.trim() ? 'Required' : v.trim().length < 2 ? 'Too short' : '',
  lastName:  (v) => !v.trim() ? 'Required' : v.trim().length < 2 ? 'Too short' : '',
  email:     (v) => !v ? 'Required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : '',
  phone:     (v) => v && !/^\+?[\d\s\-()]{7,15}$/.test(v) ? 'Invalid phone' : '',
  dob:       (v) => {
    if (!v) return 'Required'
    const age = (Date.now() - new Date(v)) / (1000 * 60 * 60 * 24 * 365.25)
    return age < 13 ? 'Must be at least 13' : ''
  },
  password:  (v) => !v ? 'Required' : v.length < 8 ? 'Min. 8 characters' : '',
  confirm:   (v, pwd) => !v ? 'Required' : v !== pwd ? 'Passwords do not match' : '',
  terms:     (v) => !v ? 'You must accept the terms' : '',
}

// ─── Small reusable field wrapper ─────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-app">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function IconInput({ icon: Icon, rightSlot, hasError, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <Icon size={15} />
        </span>
      )}
      <input
        {...props}
        className={`input-field transition-all ${Icon ? 'pl-9' : ''} ${rightSlot ? 'pr-11' : ''} ${
          hasError ? 'border-red-500/60 focus:border-red-500' : ''
        }`}
      />
      {rightSlot}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const dispatch           = useDispatch()
  const navigate           = useNavigate()
  const { isDark, toggle } = useTheme()
  const { loading, error } = useSelector((s) => s.auth)

  const [showPwd,  setShowPwd]  = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [touched,  setTouched]  = useState({})

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [dob,       setDob]       = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [terms,     setTerms]     = useState(false)

  const touch = (f) => setTouched((t) => ({ ...t, [f]: true }))

  const errors = {
    firstName: validate.firstName(firstName),
    lastName:  validate.lastName(lastName),
    email:     validate.email(email),
    phone:     validate.phone(phone),
    dob:       validate.dob(dob),
    password:  validate.password(password),
    confirm:   validate.confirm(confirm, password),
    terms:     validate.terms(terms),
  }
  const isValid = Object.values(errors).every((e) => !e)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(Object.fromEntries(Object.keys(errors).map((k) => [k, true])))
    if (!isValid) return
    const result = await dispatch(signupThunk({
      first_name:    firstName.trim(),
      last_name:     lastName.trim(),
      date_of_birth: dob,
      phone:         phone.trim(),
      email:         email.trim(),
      password,
    }))
    if (signupThunk.fulfilled.match(result)) {
      navigate('/', { replace: true })
    }
  }

  const features = [
    { icon: ShieldCheck, text: 'Secure cookie-based authentication' },
    { icon: Zap,         text: 'Real-time dashboard analytics' },
    { icon: Check,       text: 'Full order & product management' },
  ]

  return (
    <div className="min-h-screen bg-app flex overflow-hidden">

      {/* ── Branding panel ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-xs w-full">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-8 border border-white/20">
            <Zap size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            AdminDash<span className="text-brand-200"> Pro</span>
          </h1>
          <p className="text-brand-200 text-base mb-10 leading-relaxed">
            The command centre for your ecommerce operations.
          </p>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10">
                  <Icon size={15} className="text-brand-100" />
                </div>
                <span className="text-brand-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-brand-300 text-xs">
              Protected by JWT · HttpOnly cookies · CSRF-safe
            </p>
          </div>
        </div>
      </div>

      {/* ── Form panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto">

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-surface border border-app flex items-center justify-center text-muted hover:text-app transition-all"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg text-app">AdminDash Pro</span>
        </div>

        <div className="w-full max-w-[420px]">

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-app tracking-tight">Get started</h2>
            <p className="text-muted text-sm mt-1">Create your account to continue</p>
          </div>

          {/* API error */}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" error={touched.firstName && errors.firstName}>
                <IconInput
                  icon={User}
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => touch('firstName')}
                  placeholder="Jane"
                  autoComplete="given-name"
                  hasError={!!(touched.firstName && errors.firstName)}
                />
              </Field>
              <Field label="Last name" error={touched.lastName && errors.lastName}>
                <IconInput
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => touch('lastName')}
                  placeholder="Doe"
                  autoComplete="family-name"
                  hasError={!!(touched.lastName && errors.lastName)}
                />
              </Field>
            </div>

            <Field label="Email address" error={touched.email && errors.email}>
              <IconInput
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => touch('email')}
                placeholder="jane@mail.com"
                autoComplete="email"
                hasError={!!(touched.email && errors.email)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" error={touched.phone && errors.phone}>
                <IconInput
                  icon={Phone}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => touch('phone')}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  hasError={!!(touched.phone && errors.phone)}
                />
              </Field>
              <Field label="Date of birth" error={touched.dob && errors.dob}>
                <IconInput
                  icon={Calendar}
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  onBlur={() => touch('dob')}
                  max={new Date().toISOString().split('T')[0]}
                  hasError={!!(touched.dob && errors.dob)}
                />
              </Field>
            </div>

            <Field label="Password" error={touched.password && errors.password}>
              <IconInput
                icon={Lock}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => touch('password')}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                hasError={!!(touched.password && errors.password)}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <StrengthBar password={password} />
            </Field>

            <Field label="Confirm password" error={touched.confirm && errors.confirm}>
              <IconInput
                icon={Lock}
                type={showConf ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => touch('confirm')}
                placeholder="Repeat your password"
                autoComplete="new-password"
                hasError={!!(touched.confirm && errors.confirm)}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowConf((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors"
                  >
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </Field>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => { setTerms(e.target.checked); touch('terms') }}
                  className="w-4 h-4 mt-0.5 rounded border-app text-brand-500 focus:ring-brand-500/30 flex-shrink-0"
                />
                <span className="text-sm text-muted leading-relaxed">
                  I agree to the{' '}
                  <button type="button" className="text-brand-500 hover:text-brand-400">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" className="text-brand-500 hover:text-brand-400">Privacy Policy</button>
                </span>
              </label>
              {touched.terms && errors.terms && (
                <p className="text-xs text-red-500 mt-1 ml-6">{errors.terms}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating account…</>
              ) : (
                <>Create account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}