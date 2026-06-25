import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Tag, X } from 'lucide-react'
import { applyCoupon, removeCoupon, setCouponError } from '@/storefront/store/cartSlice'

// NOTE: The backend has no coupon-validation endpoint. This implements a
// small set of demo coupon codes client-side so the "Coupon Apply" feature
// is fully functional end-to-end. Swap `validateCoupon` for a real API call
// (e.g. POST /coupons/validate) when that endpoint ships.
const DEMO_COUPONS = {
  WELCOME10: 10,
  SAVE20: 20,
  AURA50: 50,
}

function validateCoupon(code) {
  const normalized = code.trim().toUpperCase()
  if (DEMO_COUPONS[normalized] != null) {
    return { valid: true, discount: DEMO_COUPONS[normalized], code: normalized }
  }
  return { valid: false }
}

export default function CouponSection() {
  const dispatch = useDispatch()
  const { couponCode, couponDiscount, couponError } = useSelector((s) => s.cart)
  const [input, setInput] = useState('')

  const handleApply = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const result = validateCoupon(input)
    if (result.valid) {
      dispatch(applyCoupon({ code: result.code, discount: result.discount }))
      setInput('')
    } else {
      dispatch(setCouponError('Invalid or expired coupon code'))
    }
  }

  const handleRemove = () => {
    dispatch(removeCoupon())
    setInput('')
  }

  if (couponCode) {
    return (
      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
          <Tag size={14} />
          {couponCode} applied — {couponDiscount}% off
        </div>
        <button onClick={handleRemove} className="text-green-600 hover:text-red-500">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleApply} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter coupon code"
          className="flex-1 bg-surface border border-app rounded-xl px-4 py-2.5 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted uppercase"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
        >
          Apply
        </button>
      </div>
      {couponError && <p className="text-xs text-red-500">{couponError}</p>}
      <p className="text-[11px] text-muted">Try: WELCOME10, SAVE20, AURA50</p>
    </form>
  )
}
