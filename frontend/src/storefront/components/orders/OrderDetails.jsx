import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMyOrder } from '@/storefront/hooks/useOrders'
import { getImageUrl, formatPrice } from '@/shared/utils/productUtils'
import OrderTimeline from '@/storefront/components/orders/OrderTimeline'

export default function OrderDetails() {
  const { id } = useParams()
  const { data: order, isLoading, isError } = useMyOrder(id)

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[800px] px-4 py-12 animate-pulse">
        <div className="h-40 bg-surface rounded-2xl mb-4" />
        <div className="h-24 bg-surface rounded-2xl" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="mx-auto w-full max-w-[800px] px-4 py-20 text-center">
        <p className="text-app font-semibold mb-4">Order not found.</p>
        <Link to="/orders" className="text-brand-500 font-semibold text-sm">Back to orders</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-muted hover:text-app mb-6">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-app">{order.order_number}</h1>
            <p className="text-xs text-muted mt-1">
              Placed on {new Date(order.ordered_at || order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-brand-500/15 text-brand-500">
            {order.tracking_status}
          </span>
        </div>

        <OrderTimeline status={order.tracking_status} expectedDeliveryDate={order.expected_delivery_date} />

        <div className="flex gap-4 pt-4 border-t border-app">
          <div className="w-20 h-24 rounded-xl bg-surface overflow-hidden border border-app shrink-0">
            {order.product_image ? (
              <img src={getImageUrl(order.product_image)} alt={order.product_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-[10px]">No Image</div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-app">{order.product_name}</p>
            <p className="text-xs text-muted mt-1">
              {order.size && `Size: ${order.size}`} {order.color && `· Color: ${order.color}`} · Qty: {order.quantity}
            </p>
            <p className="text-sm font-bold text-app mt-2">{formatPrice(order.total_amount)}</p>
          </div>
        </div>

        {order.tracking_status === 'CANCELLED' &&
         (order.payment_method || '').toUpperCase() !== 'COD' &&
         (order.payment_status || '').toUpperCase() === 'PAID' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 mb-2">
              <span>⚠️</span> Refund Information
            </div>
            <p className="text-app mb-3 text-xs leading-relaxed">
              This order has been cancelled. Online payments (Razorpay) are refunded manually after verification. Please contact our support team to request your refund.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted pt-2 border-t border-amber-500/20">
              <p><strong>Email:</strong> {import.meta.env.VITE_SUPPORT_EMAIL || 'support@mydesigners.store'}</p>
              <span className="hidden sm:inline">·</span>
              <p><strong>Refunds:</strong> Processed manually after verification</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-4 border-t border-app">
          <div>
            <p className="text-xs text-muted mb-1">Shipping Address</p>
            <p className="text-app font-medium">{order.customer_name}</p>
            <p className="text-app">
              {order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}<br />
              {order.city}, {order.state} - {order.pincode}
            </p>
            <p className="text-app mt-1">{order.customer_phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Payment</p>
            <p className="text-app font-medium">{order.payment_method}</p>
            <p className="text-app">Status: {order.payment_status}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
