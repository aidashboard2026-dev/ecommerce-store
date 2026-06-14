import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '../../../../utils/productUtils'
import { selectCartTotals, selectCartCount, SHIPPING_THRESHOLD } from '../../../../store/cartSlice'
import CouponSection from './CouponSection'

export default function CartSummary({ showCheckoutButton = true }) {
  const navigate = useNavigate()
  const totals = useSelector(selectCartTotals)
  const count = useSelector(selectCartCount)
  const { couponCode, couponDiscount } = useSelector((s) => s.cart)

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-5 sticky top-24">
      <h3 className="font-display font-bold text-lg text-app">Order Summary</h3>

      <CouponSection />

      <div className="flex flex-col gap-2.5 text-sm">
        <div className="flex justify-between text-muted">
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span className="text-app font-medium">{formatPrice(totals.subtotal)}</span>
        </div>

        {couponCode && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({couponDiscount}%)</span>
            <span>-{formatPrice(totals.discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-muted">
          <span>Shipping</span>
          <span className="text-app font-medium">
            {totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}
          </span>
        </div>

        <div className="flex justify-between text-muted">
          <span>Tax (5% GST)</span>
          <span className="text-app font-medium">{formatPrice(totals.tax)}</span>
        </div>

        {totals.subtotal > 0 && totals.subtotal < SHIPPING_THRESHOLD && (
          <p className="text-[11px] text-brand-500">
            Add {formatPrice(SHIPPING_THRESHOLD - totals.subtotal)} more for free shipping!
          </p>
        )}
      </div>

      <div className="flex justify-between items-baseline pt-4 border-t border-app">
        <span className="text-sm font-semibold text-app">Total</span>
        <span className="text-xl font-bold text-app">{formatPrice(totals.total)}</span>
      </div>

      {showCheckoutButton && (
        <button
          onClick={() => navigate('/checkout')}
          disabled={count === 0}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors"
        >
          Proceed to Checkout
        </button>
      )}
    </div>
  )
}
