import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
  Eye, EyeOff, Zap, Sun, Moon, ArrowRight,
  User, Mail, Lock, Phone, Calendar, ShieldCheck, Check,
} from 'lucide-react'
import { signupThunk } from '../../store/authSlice'
import { useTheme } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

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
    { label: 'Strong',    color: 'bg-indigo-500' },
    { label: 'Excellent', color: 'bg-emerald-500' },
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
        <p className={`text-[10px] font-semibold ${
          score <= 1 ? 'text-red-500' :
          score === 2 ? 'text-orange-400' :
          score === 3 ? 'text-yellow-500' : 'text-green-500'
        }`}>{label} Password</p>
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
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      dob,
      phone:      phone.trim(),
      email:      email.trim(),
      password,
    }))
    if (signupThunk.fulfilled.match(result)) {
      navigate('/login', { replace: true, state: { signupSuccess: true } })
    }
  }

  const features = [
    { icon: ShieldCheck, text: 'Cookie-based session guards' },
    { icon: Zap,         text: 'Live merchant statistics & charts' },
    { icon: Check,       text: 'Complete products and orders controls' },
  ]

  return (
    <div className="min-h-screen bg-app flex overflow-hidden">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[42%] relative flex-col items-center justify-center p-12 overflow-hidden border-r border-app bg-surface">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-brand-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-xs w-full">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 border border-white/20">
            <Zap size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Admin<span className="text-brand-200">Dash</span>
          </h1>
          <p className="text-brand-200 text-xs mb-10 leading-relaxed">
            Redesigned control center for high-volume merchant logistics.
          </p>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10">
                  <Icon size={14} className="text-brand-100" />
                </div>
                <span className="text-brand-100 text-xs font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="absolute top-5 right-5 w-8.5 h-8.5 rounded-xl bg-surface border border-app flex items-center justify-center text-muted hover:text-app transition-all active:scale-95 shadow-sm"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base text-app">AdminDash</span>
        </div>

        <div className="w-full max-w-[420px] space-y-6">
          <div>
            <h2 className="text-xl font-bold text-app tracking-tight">Create Account</h2>
            <p className="text-muted text-xs mt-1">Get started with a new administrator account</p>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-xs px-3.5 py-2.5 rounded-lg animate-fade-in font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => touch('firstName')}
                placeholder="Jane"
                autoComplete="given-name"
                error={touched.firstName && errors.firstName}
              />
              <Input
                label="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => touch('lastName')}
                placeholder="Doe"
                autoComplete="family-name"
                error={touched.lastName && errors.lastName}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => touch('email')}
              placeholder="jane@mail.com"
              autoComplete="email"
              error={touched.email && errors.email}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => touch('phone')}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                error={touched.phone && errors.phone}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                onBlur={() => touch('dob')}
                max={new Date().toISOString().split('T')[0]}
                error={touched.dob && errors.dob}
              />
            </div>

            <div className="space-y-1">
              <Input
                label="Password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => touch('password')}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={touched.password && errors.password}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="text-muted hover:text-app p-0.5"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
              <StrengthBar password={password} />
            </div>

            <Input
              label="Confirm Password"
              type={showConf ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => touch('confirm')}
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={touched.confirm && errors.confirm}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowConf((v) => !v)}
                  className="text-muted hover:text-app p-0.5"
                >
                  {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <div className="pt-1 select-none">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => { setTerms(e.target.checked); touch('terms') }}
                  className="w-4 h-4 mt-0.5 rounded border-app text-brand-500 focus:ring-brand-500/10 flex-shrink-0"
                />
                <span className="text-xs text-muted leading-relaxed">
                  I agree to the{' '}
                  <button type="button" className="text-brand-500 hover:text-brand-400 font-bold">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" className="text-brand-500 hover:text-brand-400 font-bold">Privacy Policy</button>
                </span>
              </label>
              {touched.terms && errors.terms && (
                <p className="text-[10px] font-semibold text-red-500 mt-1 ml-6">{errors.terms}</p>
              )}
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2"
            >
              Create Account
            </Button>
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