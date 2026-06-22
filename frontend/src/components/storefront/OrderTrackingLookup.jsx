import React, { useState } from 'react'
import { Search, MapPin } from 'lucide-react'
import { useTrackOrder } from '../../hooks/useOrders'
import { getImageUrl, formatPrice } from '../../utils/productUtils'
import OrderTimeline from './OrderTimeline'

export default function OrderTrackingLookup() {
  const [input, setInput] = useState('')
  const [orderNumber, setOrderNumber] = useState(null)
  const { data: order, isLoading, isError } = useTrackOrder(orderNumber)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) setOrderNumber(input.trim())
  }

  return (
    <div className="mx-auto w-full max-w-[700px] px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center mb-8">
        <MapPin size={32} className="text-brand-500 mx-auto mb-3" />
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-app">Track Your Order</h1>
        <p className="text-sm text-muted mt-2">Enter your order number to see its current status</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. ORD-20260613120000"
          className="flex-1 bg-surface border border-app rounded-full py-3 px-5 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-glow-sm transition-colors"
        >
          <Search size={16} /> Track
        </button>
      </form>

      {isLoading && <div className="h-40 bg-surface rounded-2xl animate-pulse" />}

      {isError && orderNumber && (
        <div className="text-center py-8">
          <p className="text-sm text-red-500">No order found with that number. Please check and try again.</p>
        </div>
      )}

      {order && (
        <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-app">{order.order_number}</h2>
              <p className="text-xs text-muted mt-1">{order.product_name}</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-brand-500/15 text-brand-500">
              {order.tracking_status}
            </span>
          </div>

          <OrderTimeline status={order.tracking_status} expectedDeliveryDate={order.expected_delivery_date} />

          <div className="flex items-center gap-4 pt-4 border-t border-app">
            <div className="w-14 h-16 rounded-xl bg-surface overflow-hidden border border-app shrink-0">
              {order.product_image ? (
                <img src={getImageUrl(order.product_image)} alt={order.product_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted text-[10px]">No Image</div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-app line-clamp-1">{order.product_name}</p>
              <p className="text-xs text-muted">Qty: {order.quantity}</p>
            </div>
            <p className="text-sm font-bold text-app">{formatPrice(order.total_amount)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
