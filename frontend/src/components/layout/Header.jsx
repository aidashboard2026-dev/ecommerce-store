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
  MoreVertical,
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
  { to: '/banners', label: 'Banners', icon: Zap },  
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
    if (
      profileRef.current &&
      !profileRef.current.contains(event.target)
    ) {
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

  const goToSettings = () => {
    navigate('/settings')
    setMobileOpen(false)
  }

  const closeAndLogout = () => {
    setMobileOpen(false)
    handleLogout()
  }

  return (
    <>
      {/* desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] shrink-0 border-r border-app bg-app shadow-sm dark:bg-surface md:flex md:flex-col">
        <Logo className="border"/>
          {/* desktop nav items */}
        <nav className="flex flex-1 flex-col justify-start px-4 gap-2 mt-8">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => clsx('nav-item group text-[var(--color-text)]', isActive && 'active')}
            >
              <Icon size={18} className="shrink-0 transition-transform duration-150 group-hover:scale-105" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
          {/* profile and theme toggle */}
        <div ref={profileRef} onClick={() => setProfileOpen((v) => !v)} className=" absolute bottom-0 w-full left-0 p-3 pt-1 cursor-pointer border-t border-app">
          <div className="flex items-center justify-between gap-2">
            <ProfileCard admin={admin} showEmail={false}/>

            <MoreVertical size={14} onClick={() => setProfileOpen((v) => !v)}
              className={clsx( 'cursor-pointer text-muted transition-transform duration-150', profileOpen && 'rotate-0')}
            />
          </div>
          {profileOpen && (
            <div className="absolute w-full bottom-3 left-0 bg-app flex flex-col items-center py-3 gap-4 ">
               <ProfileCard admin={admin}/>
              <button onClick={toggle} className="flex h-10 px-10 items-center justify-center gap-2 rounded-md  border-app">
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                Theme
              </button>
              <button onClick={handleLogout} className="flex h-10 px-10 items-center justify-center gap-2 rounded-md  border-app  text-red-600 transition-all duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
          
        </div>
      </aside>
      
          {/* mobile header */}
      <header className="right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-app bg-app/95 px-4 backdrop-blur dark:bg-surface/95 md:hidden">
        <Logo compact />
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-app bg-surface text-muted transition-all duration-150 hover:text-app hover:shadow-sm"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
        >
          <Menu size={20} />
        </button>
      </header>

        {/* mobile drawer */}
      <div className={clsx('absolute top-0 right-0 z-50  h-fit w-[240px] transition-opacity duration-300 md:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0' )} aria-hidden={!mobileOpen}>
        
        <div ref={drawerRef} className={clsx(' left-0 top-0 flex items-end justify-end h-fit w-full flex-col overflow-y-auto bg-app p-1 gap-3 shadow-xl transition-transform duration-100 ease-in-out dark:bg-surface',
            mobileOpen ? '-translate-x-0' : 'translate-x-full'
          )} role="dialog" aria-modal="true" aria-label="Mobile navigation">
           <button onClick={() => setMobileOpen(false)}
              className=" flex h-8 w-8 items-center justify-center rounded-md border border-app text-muted transition-all duration-150 hover:text-app"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
            {/* mobile items */}
          <nav className="mt-6 flex flex-col gap-1.5 w-full items-center">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => clsx('nav-item text-[var(--color-text)] pl-10 min-h-11 text-[15px]', isActive && 'active')}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
            {/* mobile profile and theme */}
          <div className="mt-auto space-y-2 border-t w-full border-app pt-4">
            <button
              onClick={toggle}
              className="flex w-full items-center justify-between rounded-md border border-app bg-surface px-4 py-3 text-sm font-medium text-app transition-all duration-150 hover:shadow-sm"
            >
              <span className="flex items-center gap-2">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                {isDark ? '' : ''}
              </span>
              Theme
              <span className="h-5 w-9 rounded-full bg-brand-100 p-0.5 dark:bg-brand-950">
                <span
                  className={clsx(
                    'block h-4 w-4 rounded-full bg-brand-500 transition-transform duration-200',
                    isDark && 'translate-x-4'
                  )}
                />
              </span>
            </button>
            <ProfileCard admin={admin} large />
            <button
              onClick={closeAndLogout}
              className="flex w-full items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-red-600 transition-all duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut size={18} />
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
    <div className="flex items-center gap-2.5 px-4 py-5  md:flex md:border-b md:border-app">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow-sm">
        <Zap size={18} strokeWidth={2.5} />
      </div>
      <span className={clsx('font-display text-lg font-bold tracking-normal text-app', compact && 'text-base')}>
        Admin<span className="text-brand-500">Dash</span>
      </span>
    </div>
  )
}

function ProfileCard({ admin, large = false, showEmail= true }) {
  const initial = admin?.name?.charAt(0).toUpperCase() || 'A'

  return (
    <div className={clsx('flex items-center gap-2', large ? 'p-3' : 'p-3')}>
      <div
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br bg-black font-bold text-white shadow-glow-sm',
          large ? 'h-10 w-10 text-base' : 'h-9 w-9 text-sm'
        )}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-app">{admin?.name || 'Admin User'}</p>
        {showEmail && (
          <p className="truncate text-xs text-muted">{admin?.email || 'admin@example.com'}</p>
        )}
      </div>
    </div>
  )
}
