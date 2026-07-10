import React, { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '@/shared/utils/productUtils'
import { closeCartDrawer, selectCartCount, selectCartTotals } from '@/storefront/store/cartSlice'
import { useCheckoutAuthModal } from '@/storefront/layouts/StorefrontLayout'

export default function CartFooter() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const count = useSelector(selectCartCount)
  const totals = useSelector(selectCartTotals)
  const { token, customer } = useSelector((s) => s.customer)
  const { openCheckoutAuthModal } = useCheckoutAuthModal()
  const checkoutButtonRef = useRef(null)

  const handleCheckout = () => {
    if (count === 0) return

    const isAuthenticated = !!(token && customer)
    if (!isAuthenticated) {
      dispatch(closeCartDrawer())
      openCheckoutAuthModal(checkoutButtonRef.current)
      return
    }

    dispatch(closeCartDrawer())
    navigate('/checkout')
  }

  return (
    <div className="border-t border-app bg-app px-4 sm:px-6 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Subtotal</span>
        <span className="font-semibold text-app">{formatPrice(totals.subtotal)}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Shipping, taxes, and discounts are calculated at checkout.
      </p>
      <button
        ref={checkoutButtonRef}
        type="button"
        onClick={handleCheckout}
        disabled={count === 0}
        className="mt-4 w-full rounded-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold shadow-glow-sm transition-colors"
      >
        Checkout - {formatPrice(totals.subtotal)}
      </button>
    </div>
  )
}
