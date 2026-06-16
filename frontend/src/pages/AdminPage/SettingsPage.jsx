import React, { useState } from 'react'
import { Sun, Moon, Monitor, Shield, Bell, Palette, User, Save } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useAuth, useTheme } from "../../hooks/useAuth"
import { setTheme } from '../../store/themeSlice'
import { adminsAPI } from '../../services/api'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { admin } = useAuth()
  const { theme, isDark, toggle } = useTheme()
  const dispatch = useDispatch()
  const [profileForm, setProfileForm] = useState({ name: admin?.name || '', email: admin?.email || '' })
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [savePwd, setSavePwd] = useState(false)

  const [notifs, setNotifs] = useState({
    email: true,
    push: false,
    weekly: true,
    security: true,
  })

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      toast.error('Name and Email are required fields')
      return
    }

    setSaving(true)
    try {
      await adminsAPI.update(admin.id, { name: profileForm.name, email: profileForm.email })
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    if (pwdForm.password !== pwdForm.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (pwdForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setSavePwd(true)
    try {
      await adminsAPI.update(admin.id, { password: pwdForm.password })
      setPwdForm({ password: '', confirm: '' })
      toast.success('Password updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update password')
    } finally {
      setSavePwd(false)
    }
  }

  const handleThemeChange = (newTheme) => {
    dispatch(
      setTheme(
        newTheme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : newTheme
      )
    )
    toast.success(`Theme updated to ${newTheme}`)
  }

  const toggleNotification = (key) => {
    setNotifs((n) => {
      const updated = { ...n, [key]: !n[key] }
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} preference updated`)
      return updated
    })
  }

  return (
    <div className="space-y-8 py-6">
      <PageHeader
        title="Settings"
        description="Manage your account settings, security preferences, color theme, and email notifications."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <User size={16} />
              </div>
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details and account role info.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input
                label="Full Name"
                id="profile-name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Enter your name"
              />
              <Input
                label="Email Address"
                type="email"
                id="profile-email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Enter your email"
              />
              <Input
                label="Administrator Role"
                id="profile-role"
                value={admin?.role || 'Administrator'}
                disabled
                helperText="Your role is managed by the system administrator and cannot be modified."
              />
              <div className="pt-2 flex justify-end">
                <Button type="submit" loading={saving} icon={Save}>
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 dark:text-rose-400">
                <Shield size={16} />
              </div>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Change your password to keep your account secure.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                id="new-password"
                value={pwdForm.password}
                onChange={(e) => setPwdForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                id="confirm-password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password"
              />
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  loading={savePwd}
                  disabled={!pwdForm.password || !pwdForm.confirm}
                  variant="primary"
                  icon={Shield}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <Palette size={16} />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Select your dashboard&apos;s visual theme preference.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-xs font-semibold text-app">Theme Mode</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => {
                  const isActive = theme === value || (value === 'system' && false) // Matches backend/original logic for simplicity
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => handleThemeChange(value)}
                      className={clsx(
                        'flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 outline-none text-center',
                        isActive
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/10'
                          : 'border-app hover:border-brand-500/30 text-muted hover:text-app hover:bg-surface-hover'
                      )}
                    >
                      <Icon size={20} className={clsx(isActive ? 'text-brand-500 dark:text-brand-400' : 'text-muted')} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                <Bell size={16} />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure where and how you want to receive alerts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {Object.entries({
                email: { label: 'Email notifications', desc: 'Receive daily status digests and summaries.' },
                push: { label: 'Push notifications', desc: 'Get instant browser updates on new orders.' },
                weekly: { label: 'Weekly digest', desc: 'A consolidated weekly sales performance summary.' },
                security: { label: 'Security alerts', desc: 'Get notified of unusual access attempts or settings changes.' },
              }).map(([key, { label, desc }]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-app">{label}</p>
                    <p className="text-[11px] text-muted leading-relaxed">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNotification(key)}
                    className={clsx(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      notifs[key] ? 'bg-brand-500' : 'bg-zinc-200 dark:bg-zinc-800'
                    )}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                        notifs[key] ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

