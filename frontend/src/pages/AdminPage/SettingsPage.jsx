import React, { useState } from 'react'
import { Sun, Moon, Monitor, Shield, Bell, Palette, User, Save } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useAuth, useTheme } from "../../hooks/useAuth";
import { setTheme } from '../../store/themeSlice'
import { adminsAPI } from '../../services/api'
import clsx from 'clsx'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5 pb-5 border-b border-app">
        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
          <Icon size={16} className="text-brand-500" />
        </div>
        <h2 className="font-display font-bold text-base text-app">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { admin } = useAuth()
  const { theme, isDark, toggle } = useTheme()
  const dispatch = useDispatch()
  const [profileForm, setProfileForm] = useState({ name: admin?.name || '', email: admin?.email || '' })
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [savePwd, setSavePwd] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [notifs, setNotifs] = useState({
    email: true, push: false, weekly: true, security: true,
  })

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    try {
      await adminsAPI.update(admin.id, { name: profileForm.name, email: profileForm.email })
      setSuccessMsg('Profile updated successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    if (pwdForm.password !== pwdForm.confirm) {
      setErrorMsg('Passwords do not match')
      return
    }
    setSavePwd(true)
    setErrorMsg('')
    try {
      await adminsAPI.update(admin.id, { password: pwdForm.password })
      setPwdForm({ password: '', confirm: '' })
      setSuccessMsg('Password updated successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update password')
    } finally {
      setSavePwd(false)
    }
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-app">Settings</h1>
        <p className="text-muted text-sm mt-1">Manage your account and preferences</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl animate-fade-in">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl animate-fade-in">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile */}
        <Section title="Profile" icon={User}>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-app">Name</label>
              <input
                className="input-field mt-1"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-app">Email</label>
              <input
                type="email"
                className="input-field mt-1"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-app">Role</label>
              <input className="input-field mt-1 opacity-60 cursor-not-allowed" value={admin?.role} disabled />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save size={15} />}
              Save Profile
            </button>
          </form>
        </Section>

        {/* Password */}
        <Section title="Security" icon={Shield}>
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-app">New Password</label>
              <input
                type="password"
                className="input-field mt-1"
                value={pwdForm.password}
                onChange={(e) => setPwdForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-app">Confirm Password</label>
              <input
                type="password"
                className="input-field mt-1"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password"
              />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={savePwd || !pwdForm.password}>
              {savePwd ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Shield size={15} />}
              Update Password
            </button>
          </form>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" icon={Palette}>
          <div className="space-y-4">
            <p className="text-sm font-medium text-app">Color Theme</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => dispatch(setTheme(value === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : value))}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150',
                    theme === value || (value === 'system' && false)
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400'
                      : 'border-app text-muted hover:border-brand-300 hover:text-app'
                  )}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <div className="space-y-4">
            {Object.entries({
              email: 'Email notifications',
              push: 'Push notifications',
              weekly: 'Weekly digest',
              security: 'Security alerts',
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-app">{label}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {key === 'security' ? 'Always recommended' : 'Customize your preferences'}
                  </p>
                </div>
                <button
                  onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0',
                    notifs[key] ? 'bg-brand-500' : 'bg-surface border-2 border-app'
                  )}
                >
                  <div className={clsx(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200',
                    notifs[key] ? 'left-[22px]' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
