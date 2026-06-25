import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { User, Phone, Mail, ClipboardList, Lock, Save, MapPin, Heart, Settings } from 'lucide-react'
import clsx from 'clsx'
import { updateCustomerProfileThunk } from '@/storefront/store/customerSlice'
import OrdersList from '@/storefront/components/OrdersList'
import CheckoutForm from '@/storefront/components/CheckoutForm'
import WishlistGrid from '@/storefront/components/WishlistGrid'

// ─── Profile tab — account details form (unchanged from original) ──────────
function AccountDetailsSection() {
  const dispatch = useDispatch()
  const { customer, loading } = useSelector((s) => s.customer)
  const [form, setForm] = useState({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    phone: customer?.phone || '',
  })

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    const result = await dispatch(updateCustomerProfileThunk(form))
    if (updateCustomerProfileThunk.fulfilled.match(result)) {
      toast.success('Profile updated')
    } else {
      toast.error('Failed to update profile')
    }
  }

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-app mb-4">Account Details</h2>
      <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={form.first_name}
            onChange={update('first_name')}
            placeholder="First name"
            className="w-full bg-surface border border-app rounded-xl py-2.5 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
        <div className="relative">
          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={form.last_name}
            onChange={update('last_name')}
            placeholder="Last name"
            className="w-full bg-surface border border-app rounded-xl py-2.5 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
        <div className="relative sm:col-span-2">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={customer?.email || ''}
            disabled
            className="w-full bg-surface border border-app rounded-xl py-2.5 pl-11 pr-4 text-sm text-muted cursor-not-allowed"
          />
        </div>
        <div className="relative sm:col-span-2">
          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={form.phone}
            onChange={update('phone')}
            placeholder="Phone number"
            className="w-full bg-surface border border-app rounded-xl py-2.5 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-full transition-colors mt-1"
        >
          <Save size={16} /> Save Changes
        </button>
      </form>
    </div>
  )
}

// ─── Account Settings tab — split out from the original Profile view ───────
function AccountSettingsSection() {
  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-app mb-2 flex items-center gap-2">
        <Lock size={16} /> Password
      </h2>
      <p className="text-xs text-muted">
        Password changes aren't available yet. Contact support if you need to reset your password.
      </p>
    </div>
  )
}

const TABS = [
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
  { key: 'orders', label: 'Orders', icon: ClipboardList, path: '/profile/orders' },
  { key: 'addresses', label: 'Addresses', icon: MapPin, path: '/profile/addresses' },
  { key: 'wishlist', label: 'Wishlist', icon: Heart, path: '/profile/wishlist' },
  { key: 'settings', label: 'Account Settings', icon: Settings, path: '/profile/settings' },
]

function activeTabFromPath(pathname) {
  if (pathname.endsWith('/orders')) return 'orders'
  if (pathname.endsWith('/addresses')) return 'addresses'
  if (pathname.endsWith('/wishlist')) return 'wishlist'
  if (pathname.endsWith('/settings')) return 'settings'
  return 'profile'
}

export default function ProfilePage() {
  const location = useLocation()
  const activeTab = activeTabFromPath(location.pathname)

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-app mb-6">My Account</h1>

      <div className="flex gap-2 mb-8 border-b border-app overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted hover:text-app'
            )}
          >
            <tab.icon size={14} /> {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === 'orders' && <OrdersList />}
      {activeTab === 'addresses' && <CheckoutForm />}
      {activeTab === 'wishlist' && <WishlistGrid />}
      {activeTab === 'settings' && <AccountSettingsSection />}
      {activeTab === 'profile' && <AccountDetailsSection />}
    </div>
  )
}
