import React, { useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '@/shared/utils/productUtils'
import {
  selectCartLineItems,
  selectCartTotals,
  selectCartCount,
} from '@/storefront/store/cartSlice'
import { useCheckoutAuthModal } from '@/storefront/layouts/StorefrontLayout'
import CartCoupon from './CartCoupon'
import { formatQuantitySubtotal } from '@/shared/utils/checkoutTotals'

export default function CartSummary({ showCheckoutButton = true }) {
  const navigate = useNavigate()
  const totals = useSelector(selectCartTotals)
  const lineItems = useSelector(selectCartLineItems)
  const count = useSelector(selectCartCount)
  const { couponCode, couponDiscount } = useSelector((s) => s.cart)
  const { token, customer } = useSelector((s) => s.customer)
  const { openCheckoutAuthModal } = useCheckoutAuthModal()
  const checkoutButtonRef = useRef(null)

  const handleCheckout = () => {
    if (count === 0) return

    const isAuthenticated = !!(token && customer)
    if (!isAuthenticated) {
      openCheckoutAuthModal(checkoutButtonRef.current)
      return
    }

    navigate('/checkout')
  }

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-5 sticky top-24">
      <h3 className="font-display font-bold text-lg text-app">Order Summary</h3>

      <CartCoupon />

      <div className="flex flex-col gap-2.5 text-sm">
        {lineItems.length > 1
          ? lineItems.map((lineItem) => (
              <div key={lineItem.id} className="flex justify-between text-muted">
                <span className="pr-3">{lineItem.title}</span>
                <span className="text-app font-medium text-right">
                  {formatQuantitySubtotal(
                    lineItem.price,
                    lineItem.quantity,
                    formatPrice,
                  )}
                </span>
              </div>
            ))
          : lineItems.length === 1 && (
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-app font-medium">
                  {formatQuantitySubtotal(
                    lineItems[0].price,
                    lineItems[0].quantity,
                    formatPrice,
                  )}
                </span>
              </div>
            )}

        {lineItems.length > 1 && (
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="text-app font-medium">{formatPrice(totals.subtotal)}</span>
          </div>
        )}

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
      </div>

      <div className="flex justify-between items-baseline pt-4 border-t border-app">
        <span className="text-sm font-semibold text-app">Total</span>
        <span className="text-xl font-bold text-app">{formatPrice(totals.total)}</span>
      </div>

      {showCheckoutButton && (
        <button
          ref={checkoutButtonRef}
          type="button"
          onClick={handleCheckout}
          disabled={count === 0}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors"
        >
          Proceed to Checkout
        </button>
      )}
    </div>
  )
}
