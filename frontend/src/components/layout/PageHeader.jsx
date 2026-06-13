import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import clsx from 'clsx'

import {
  Search,
  Bell,
  Sun,
  Moon,
  MoreVertical,
  LogOut,
  Settings
} from 'lucide-react'

import { useAuth, useTheme } from '../../hooks/useAuth'
import { logout } from '../../store/authSlice'



export default function PageHeader({ title }) {
  const { admin } = useAuth()
  const initial = admin?.name ? admin.name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  : 'A'
  const { isDark, toggle } = useTheme()

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef(null)

  useEffect(() => {
  function handleClickOutside(event) {
    // console.log('outside click')
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
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const goToSettings = () => {
    navigate('/settings')
    setProfileOpen(false)
  }

  return (
    <div className="flex bg-app/80 backdrop-blur-md py-3.5 px-6 items-center top-0 justify-between gap-4 border-b border-app">
      {/* Left Side */}
      <div>
        <h1 className="text-sm font-bold tracking-tight text-app uppercase">
          {title}
        </h1>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3.5">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand-500"
          />

          <input
            type="text"
            placeholder="Search anything..."
            className="w-56 rounded-lg border border-app bg-surface px-3 py-1.5 pl-9 pr-3 text-app text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-muted/60"
          />
        </div>

        {/* Notification */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-app hover:bg-surface text-muted hover:text-app transition-all">
          <Bell size={15} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-app hover:bg-surface text-muted hover:text-app transition-all"
        >
          {isDark ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold shadow-glow-sm hover:opacity-90 transition-opacity"
          >
            {initial}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-app bg-surface p-4 shadow-elevated animate-slide-up">
              <div className="mb-3 border-b border-app pb-3">
                <ProfileCard admin={admin} />
              </div>

              <button
                onClick={goToSettings}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-app hover:bg-app transition-colors"
              >
                <Settings size={14} className="text-muted" />
                Settings
              </button>

              <button
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ admin, large = false, showEmail = true }) {
  const initial = admin?.name
    ? admin.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : 'A'

  return (
    <div className={clsx('flex items-center gap-2', large ? 'p-3' : 'p-3')}>
      <div
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white shadow-glow-sm',
          large ? 'h-10 w-10 text-base' : 'h-9 w-9 text-sm'
        )}
      >
        {initial}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-app">
          {admin?.name || 'Admin User'}
        </p>

        {showEmail && (
          <p className="truncate text-xs text-muted">
            {admin?.email || 'admin@example.com'}
          </p>
        )}
      </div>
    </div>
  )
}