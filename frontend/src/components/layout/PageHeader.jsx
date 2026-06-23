import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import clsx from 'clsx'

import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  X
} from 'lucide-react'

import { useAuth, useTheme } from '../../hooks/useAuth'
import { logout } from '../../store/authSlice'
import Avatar from '../ui/Avatar'

export default function PageHeader({ title }) {
  const { admin } = useAuth()
  const { isDark, toggle } = useTheme()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
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
  navigate('/admin/settings')
  setProfileOpen(false)
}

  const names = admin?.name?.split(' ') || ['Admin']
  const firstName = names[0]
  const lastName = names[1] || ''

  return (
    <div className="hidden md:flex md:border-b border-app md:bg-surface md:shadow-sm transition-all duration-300 py-3 px-6 items-center top-0 justify-between gap-4 h-[53px] ">
      {/* Left Side */}
      <div className=''>
        <h1 className="text-xs font-bold uppercase tracking-wider text-app">
          {title}
        </h1>
      </div>

      {/* Right Side */}
      <div className="hidden md:flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search
            size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search console..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-app bg-app/50 px-3 py-1.5 pl-9 pr-8 text-app text-xs outline-none focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-muted/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-app"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Notifications */}
        {/* <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-app bg-surface hover:bg-app text-muted hover:text-app transition-all active:scale-95"
          aria-label="View notifications"
        >
          <Bell size={14} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
        </button> */}

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-app bg-surface hover:bg-app text-muted hover:text-app transition-all active:scale-95"
          aria-label="Toggle theme"
        >
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </button>

        <span className="h-4 w-px bg-border/60" />

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center hover:opacity-90 transition-opacity active:scale-95"
            aria-label="Profile actions"
          >
            <Avatar size="sm" firstName={firstName} lastName={lastName} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-app bg-surface p-2 shadow-elevated animate-slide-up">
              <div className="flex items-center gap-3 p-2.5 border-b border-app mb-1.5">
                <Avatar size="sm" firstName={firstName} lastName={lastName} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-app">
                    {admin?.name || 'Admin User'}
                  </p>
                  <p className="truncate text-[10px] text-muted font-medium mt-0.5">
                    {admin?.email || 'admin@example.com'}
                  </p>
                </div>
              </div>

              <button
                onClick={goToSettings}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-app hover:bg-app transition-colors"
              >
                <Settings size={13} className="text-muted" />
                Account Settings
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
      </div>
    </div>
  )
}