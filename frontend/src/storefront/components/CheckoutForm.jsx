import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MapPin, Plus, Check } from 'lucide-react'
import clsx from 'clsx'
import { addAddress, selectAddress, removeAddress, selectSelectedAddress } from '@/storefront/store/checkoutStore'

const INDIAN_STATES = [
  'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana',
  'Maharashtra', 'Delhi', 'Gujarat', 'Rajasthan', 'Uttar Pradesh',
  'West Bengal', 'Punjab', 'Haryana', 'Bihar', 'Madhya Pradesh',
]

const emptyForm = {
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
}

export default function CheckoutForm() {
  const dispatch = useDispatch()
  const addresses = useSelector((s) => s.checkout.addresses)
  const selectedAddress = useSelector(selectSelectedAddress)
  const [showForm, setShowForm] = useState(addresses.length === 0)
  const [form, setForm] = useState(emptyForm)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = (e) => {
    e.preventDefault()
    dispatch(addAddress(form))
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <h2 className="font-display font-bold text-lg text-app flex items-center gap-2">
        <MapPin size={18} /> Delivery Address
      </h2>

      {addresses.length > 0 && (
        <div className="flex flex-col gap-3">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => dispatch(selectAddress(addr.id))}
              className={clsx(
                'text-left border rounded-xl p-4 transition-colors relative',
                selectedAddress?.id === addr.id
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-app hover:border-brand-500/50'
              )}
            >
              {selectedAddress?.id === addr.id && (
                <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                  <Check size={12} />
                </span>
              )}
              <p className="text-sm font-semibold text-app">{addr.full_name}</p>
              <p className="text-xs text-muted mt-1">
                {addr.address_line1}
                {addr.address_line2 ? `, ${addr.address_line2}` : ''}, {addr.city}, {addr.state} - {addr.pincode}
              </p>
              <p className="text-xs text-muted mt-1">Phone: {addr.phone}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  dispatch(removeAddress(addr.id))
                }}
                className="text-[11px] text-red-500 mt-2 hover:underline"
              >
                Remove
              </button>
            </button>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-500 hover:text-brand-600"
        >
          <Plus size={16} /> Add New Address
        </button>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Full Name"
            value={form.full_name}
            onChange={update('full_name')}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />
          <input
            required
            type="tel"
            placeholder="Phone Number"
            value={form.phone}
            onChange={update('phone')}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />
          <input
            required
            placeholder="Address Line 1"
            value={form.address_line1}
            onChange={update('address_line1')}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />
          <input
            placeholder="Address Line 2 (optional)"
            value={form.address_line2}
            onChange={update('address_line2')}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />
          <input
            required
            placeholder="City"
            value={form.city}
            onChange={update('city')}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
          />
          <select
            required
            value={form.state}
            onChange={update('state')}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          >
            <option value="">Select State</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            required
            placeholder="Pincode"
            value={form.pincode}
            onChange={update('pincode')}
            pattern="\d{4,10}"
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-2.5 rounded-full transition-colors"
            >
              Save Address
            </button>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 border border-app rounded-full text-sm font-semibold text-app hover:bg-surface"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
