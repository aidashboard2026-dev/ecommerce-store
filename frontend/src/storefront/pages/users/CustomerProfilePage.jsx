import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { User, Phone, Mail, ClipboardList, Lock, Save } from 'lucide-react'
import clsx from 'clsx'
import { updateCustomerProfileThunk } from '@/storefront/store/customerSlice'
import OrdersPage from '@/storefront/pages/ordercheckout/OrdersPage'

function ProfileDetails() {
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
    <div className="flex flex-col gap-6">
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

      <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
        <h2 className="font-display font-bold text-lg text-app mb-2 flex items-center gap-2">
          <Lock size={16} /> Password
        </h2>
        <p className="text-xs text-muted">
          Password changes aren't available yet. Contact support if you need to reset your password.
        </p>
      </div>
    </div>
  )
}

export default function CustomerProfilePage() {
  const location = useLocation()
  const isOrdersTab = location.pathname.endsWith('/orders')

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-app mb-6">My Account</h1>

      <div className="flex gap-2 mb-8 border-b border-app">
        <Link
          to="/profile"
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
            !isOrdersTab ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted hover:text-app'
          )}
        >
          <User size={14} /> Profile
        </Link>
        <Link
          to="/profile/orders"
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
            isOrdersTab ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted hover:text-app'
          )}
        >
          <ClipboardList size={14} /> Orders
        </Link>
      </div>

      {isOrdersTab ? <OrdersPage /> : <ProfileDetails />}
    </div>
  )
}
