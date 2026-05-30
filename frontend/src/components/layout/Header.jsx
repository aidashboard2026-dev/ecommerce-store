import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  LayoutDashboard, Users, Package, BarChart3, Settings,
  Sun, Moon, LogOut, ChevronDown, Menu, X, Zap
} from 'lucide-react'
import { useAuth, useTheme } from '../../hooks/useAuth'
import { logout } from '../../store/authSlice'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Header() {
  const { admin } = useAuth()
  const { isDark, toggle } = useTheme()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-app/80 backdrop-blur-xl border-b border-app">
        <div className="max-w-[1400px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-700 text-lg text-app tracking-tight hidden sm:block">
              Admin<span className="text-brand-500">Dash</span>
            </span>
          </div>

          {/* Desktop Nav — centered */}
          <nav className="hidden lg:flex items-center gap-1 mx-auto">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx('nav-item', isActive && 'active')
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-app hover:bg-surface transition-all duration-150"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-surface transition-all duration-150"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                  {admin?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <span className="text-sm font-medium text-app hidden sm:block max-w-[100px] truncate">
                  {admin?.name || 'Admin'}
                </span>
                <ChevronDown
                  size={14}
                  className={clsx('text-muted transition-transform duration-150', profileOpen && 'rotate-180')}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-app rounded-2xl shadow-lg overflow-hidden animate-fade-in">
                  <div className="p-3 border-b border-app">
                    <p className="text-sm font-semibold text-app">{admin?.name}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{admin?.email}</p>
                    <span className="inline-block mt-1.5 text-xs bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium capitalize">
                      {admin?.role}
                    </span>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { navigate('/settings'); setProfileOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app hover:bg-app rounded-xl transition-colors duration-100"
                    >
                      <Settings size={15} className="text-muted" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors duration-100"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-app hover:bg-surface transition-all"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <nav className="absolute top-16 left-0 right-0 bg-app border-b border-app p-3 animate-slide-up">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx('nav-item w-full mb-1', isActive && 'active')
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
