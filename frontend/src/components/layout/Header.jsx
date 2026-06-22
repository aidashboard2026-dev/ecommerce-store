import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
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
  Bell
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth, useTheme } from '../../hooks/useAuth'
import { logout } from '../../store/authSlice'
// import { toggleSidebar } from '../../store/uiSlice'
import Avatar from '../ui/Avatar'
import ProfileCard from '../ui/ProfileCard'

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
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen)

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

  const initial = admin?.name?.charAt(0).toUpperCase() || 'A'
  const names = admin?.name?.split(' ') || ['Admin']
  const firstName = names[0]
  const lastName = names[1] || ''

  return (
    <>
      {/* desktop sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 z-30  w-60 hidden h-screen border-r border-app bg-surface shadow-sm transition-all duration-300 md:flex md:flex-col',

        )}
      >
        <Logo />

        {/* desktop nav items */}
        <nav className="flex flex-1 flex-col justify-start px-3.5 mt-6 gap-1.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-normal transition-all duration-150 cursor-pointer group',
                  isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                    : 'text-muted hover:text-app hover:bg-app'
                )
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon
                size={16}
                className="shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <span
                className={clsx(
                  'transition-all duration-200 truncate',
                  sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                )}
              >
                {label}
              </span>
            </NavLink>
          ))}
        </nav>


        {/* profile and theme toggle */}
        <div ref={profileRef} className="relative w-full p-4 border-t border-app">
          <div
            className="flex items-center gap-3.5 cursor-pointer p-1.5 rounded-lg hover:bg-app transition-colors"
          >
            <Avatar size="sm" firstName={firstName} lastName={lastName} />
            <div
              className={clsx(
                'min-w-0 transition-all duration-200 flex-1 flex items-center justify-between',
                sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
              <div className="truncate">
                <p className="truncate text-xs font-bold text-app">{admin?.name || 'Admin User'}</p>
                <p className="truncate text-[10px] text-muted font-medium mt-0.5">
                  {admin?.email || 'admin@example.com'}
                </p>
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded text-muted">
                <span className="text-sm">⋯</span>
              </div>
            </div>
          </div>

          {profileOpen && (
            <div
              className={clsx(
                'absolute bottom-[72px] z-50 rounded-xl border border-app bg-surface p-2 shadow-elevated animate-slide-up',
                sidebarOpen ? 'left-4 w-[208px]' : 'left-2 w-[190px]'
              )}
            >
              <div className="mb-4 border-b border-app pb-4">
                <ProfileCard admin={admin} />
              </div>
              <button
                onClick={toggle}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-app hover:bg-app transition-colors"
              >
                {isDark ? <Sun size={13} className="text-muted" /> : <Moon size={13} className="text-muted" />}
                Toggle Theme
              </button>
              <button
                onClick={handleLogout}
                className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* mobile header */}
      <header className="right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-app bg-surface/90 px-4 backdrop-blur md:hidden">
        <Logo compact />
        <div className="flex items-center gap-2">
          {/* Notifications */}
          {/* <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-app bg-surface hover:bg-app text-muted hover:text-app transition-all active:scale-95"
            aria-label="View notifications"
          >
            <Bell size={14} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
          </button> */}

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-app bg-surface hover:bg-app text-muted hover:text-app transition-all active:scale-95"
            aria-label="Toggle theme"
          >
            {isDark ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <span className="h-4 w-px bg-border/60" />

          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-app bg-app text-muted hover:text-app transition-all active:scale-95"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={18} />
          </button>

        </div>

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
            <div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-app text-muted hover:text-app transition-all active:scale-95"
                aria-label="Close navigation menu"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* mobile items */}
          <nav className="flex flex-col gap-1 w-full">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                      : 'text-muted hover:text-app hover:bg-app'
                  )
                }
              >
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* mobile profile and theme */}
          <div className="mt-auto space-y-3 border-t border-app pt-6">


            <div className="border border-app rounded-xl p-2.5 bg-app flex items-center gap-3">
              <Avatar size="sm" firstName={firstName} lastName={lastName} />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-app">{admin?.name || 'Admin User'}</p>
                <p className="truncate text-[10px] text-muted mt-0.5">{admin?.email || 'admin@example.com'}</p>
              </div>
            </div>

            <button
              onClick={closeAndLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-95 shadow-sm border border-red-600"
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

function Logo({ compact = false, sidebarOpen = true }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4 h-[53px]">
      <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow-sm shrink-0">
        <Zap size={14} strokeWidth={2.5} />
      </div>
      <span
        className={clsx(
          'font-display text-sm font-bold tracking-tight text-app transition-all duration-200 truncate',
          compact && 'text-xs',
          sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
        )}
      >
        Admin<span className="text-brand-500">Dash</span>
      </span>
    </div>
  )
}
