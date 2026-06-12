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
    <div className="mb-6 flex bg-app items-center justify-between gap-4">
      {/* Left Side */}
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-app">
          {title}
        </h1>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />

          <input
            type="text"
            placeholder="Search..."
            className="w-64 rounded-xl border border-app bg-surface py-2 pl-10 pr-4 outline-none"
          />
        </div>

        {/* Notification */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-app hover:bg-surface">
          <Bell size={18} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-app hover:bg-surface"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
            <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white font-semibold hover:opacity-90"
            >
    
                {initial}
            </button>

          {profileOpen && (
            <div className="absolute right-0 top-14 z-50 w-64 rounded-xl border border-app bg-app p-4 shadow-xl">
              <div className="mb-4 border-b border-app pb-4">
                <ProfileCard admin={admin} />
              </div>

              <button
                onClick={goToSettings}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface"
              >
                <Settings size={16} />
                Settings
              </button>

              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut size={16} />
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