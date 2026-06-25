import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react'
import { formatPrice } from '@/shared/utils/productUtils'

// NOTE: The backend does not expose a payment gateway integration or a
// customer-facing endpoint to update payment_status after order creation.
// This page simulates the payment confirmation step so the UX flow
// (Checkout → Payment → Order Success/Failure → Tracking) is complete.
// Orders are already created (status PLACED / PENDING) before reaching here.
// Wire a real gateway (Razorpay/Stripe) + a payment-status webhook here
// when those become available.

export default function PaymentPage() {
  const navigate = useNavigate()
  const lastOrder = useSelector((s) => s.checkout.lastOrder)
  const [status, setStatus] = useState('processing') // processing | success | failed

  useEffect(() => {
    if (!lastOrder) return
    const timer = setTimeout(() => {
      setStatus('success')
    }, 2200)
    return () => clearTimeout(timer)
  }, [lastOrder])

  if (!lastOrder) {
    return <Navigate to="/cart" replace />
  }

  const { orders = [], totals, paymentMethod } = lastOrder

  const handleRetry = () => {
    setStatus('processing')
    setTimeout(() => setStatus('success'), 2000)
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 sm:py-24 flex flex-col items-center text-center gap-6">
      {status === 'processing' && (
        <>
          <Loader2 size={48} className="text-brand-500 animate-spin" />
          <div>
            <h1 className="font-display font-bold text-xl text-app mb-1">Processing Payment</h1>
            <p className="text-sm text-muted">
              Connecting to your {paymentMethod} provider… please don't close this window.
            </p>
          </div>
          <div className="bg-surface rounded-xl px-6 py-3 text-sm font-semibold text-app">
            Amount: {formatPrice(totals?.total ?? 0)}
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 size={56} className="text-green-500" />
          <div>
            <h1 className="font-display font-bold text-2xl text-app mb-1">Payment Successful!</h1>
            <p className="text-sm text-muted">
              Your order {orders.length > 1 ? `(${orders.length} items)` : ''} has been confirmed.
            </p>
          </div>

          <div className="w-full bg-app border border-app rounded-2xl p-5 flex flex-col gap-2 text-left">
            {orders.map((o) => (
              <div key={o.id} className="flex justify-between text-sm">
                <span className="text-muted">{o.order_number}</span>
                <span className="font-semibold text-app">{formatPrice(o.total_amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-app font-bold text-app">
              <span>Total Paid</span>
              <span>{formatPrice(totals?.total ?? 0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={14} /> Secured by 256-bit SSL encryption
          </div>

          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors"
          >
            View My Orders
          </button>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle size={56} className="text-red-500" />
          <div>
            <h1 className="font-display font-bold text-2xl text-app mb-1">Payment Failed</h1>
            <p className="text-sm text-muted">
              We couldn't process your payment. Your order has been saved — you can retry or pay via Cash on Delivery.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors"
          >
            Retry Payment
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="w-full border border-app text-app font-semibold text-sm py-3 rounded-full hover:bg-surface transition-colors"
          >
            Go to My Orders
          </button>
        </>
      )}
    </div>
  )
}
