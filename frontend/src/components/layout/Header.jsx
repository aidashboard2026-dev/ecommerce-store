import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Settings,
  ShoppingCart,
  Sun,
  Tags,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth, useTheme } from '../../hooks/useAuth'
import { logout } from '../../store/authSlice'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/offers', label: 'Offers', icon: Tags },
  { to: '/customers', label: 'Customers', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Header() {
  const { admin } = useAuth()
  const { isDark, toggle } = useTheme()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    if (!mobileOpen) return undefined

    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setMobileOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!profileOpen) return

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileOpen])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const closeAndLogout = () => {
    setMobileOpen(false)
    handleLogout()
  }

  return (
    <>
      {/* desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] shrink-0 border-r border-app bg-surface shadow-sm md:flex md:flex-col">
        <Logo />

        {/* desktop nav items */}
        <nav className="flex flex-1 flex-col justify-start px-4 mt-6 gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => clsx('nav-item group', isActive && 'active')}
            >
              <Icon size={16} className="shrink-0 transition-transform duration-150 group-hover:scale-105" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* profile and theme toggle */}
        <div ref={profileRef} className="relative w-full p-4 border-t border-app">
          <div 
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center justify-between gap-2 cursor-pointer p-1 rounded-lg hover:bg-app transition-colors"
          >
            <ProfileCard admin={admin} showEmail={false} />
            <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-app">
              <span className="text-lg">⋯</span>
            </div>
          </div>

          {profileOpen && (
            <div className="absolute left-4 bottom-[72px] z-50 w-[208px] rounded-xl border border-app bg-surface p-2 shadow-elevated animate-slide-up">
              <div className="border-b border-app pb-2 mb-1.5">
                <ProfileCard admin={admin} showEmail={true} />
              </div>
              <button 
                onClick={toggle} 
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-app hover:bg-app transition-colors"
              >
                {isDark ? <Sun size={14} className="text-muted" /> : <Moon size={14} className="text-muted" />}
                Toggle Theme
              </button>
              <button 
                onClick={handleLogout} 
                className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
      
      {/* mobile header */}
      <header className="right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-app bg-surface/90 px-4 backdrop-blur md:hidden">
        <Logo compact />
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-app bg-app text-muted hover:text-app transition-all active:scale-95"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
        >
          <Menu size={18} />
        </button>
      </header>

      {/* mobile drawer */}
      <div 
        className={clsx(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!mobileOpen}
      >
        <div 
          ref={drawerRef} 
          className={clsx(
            'absolute right-0 top-0 bottom-0 flex h-full w-[260px] flex-col bg-surface p-6 shadow-2xl transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          )} 
          role="dialog" 
          aria-modal="true" 
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-between border-b border-app pb-4 mb-6">
            <Logo compact />
            <button 
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-app text-muted hover:text-app transition-all active:scale-95"
              aria-label="Close navigation menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* mobile items */}
          <nav className="flex flex-col gap-1 w-full">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => clsx('nav-item py-3', isActive && 'active')}
              >
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* mobile profile and theme */}
          <div className="mt-auto space-y-3 border-t border-app pt-6">
            <button
              onClick={toggle}
              className="flex w-full items-center justify-between rounded-lg border border-app bg-app px-4 py-2.5 text-xs font-semibold text-app transition-all hover:bg-surface active:scale-95"
            >
              <span className="flex items-center gap-2">
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
              <span className="h-4.5 w-8 rounded-full bg-brand-100 p-0.5 dark:bg-brand-950 flex items-center">
                <span
                  className={clsx(
                    'block h-3.5 w-3.5 rounded-full bg-brand-500 transition-transform duration-200',
                    isDark && 'translate-x-3.5'
                  )}
                />
              </span>
            </button>

            <div className="border border-app rounded-xl p-2 bg-app">
              <ProfileCard admin={admin} showEmail={true} />
            </div>

            <button
              onClick={closeAndLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5 px-6 py-5 border-b border-app">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow-sm">
        <Zap size={15} strokeWidth={2.5} />
      </div>
      <span className={clsx('font-display text-base font-bold tracking-tight text-app', compact && 'text-sm')}>
        Admin<span className="text-brand-500">Dash</span>
      </span>
    </div>
  )
}

function ProfileCard({ admin, showEmail = true }) {
  const initial = admin?.name?.charAt(0).toUpperCase() || 'A'

  return (
    <div className="flex items-center gap-3 p-1.5">
      <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white text-xs shadow-glow-sm">
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-app">{admin?.name || 'Admin User'}</p>
        {showEmail && (
          <p className="truncate text-[10px] text-muted font-medium mt-0.5">{admin?.email || 'admin@example.com'}</p>
        )}
      </div>
    </div>
  )
}
