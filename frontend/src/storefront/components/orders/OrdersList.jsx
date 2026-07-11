import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Package, ChevronDown, ChevronUp, XCircle, Download } from 'lucide-react'
import clsx from 'clsx'
import { useMyOrders, useCancelOrder } from '@/storefront/hooks/useOrders'
import { getImageUrl, formatPrice } from '@/shared/utils/productUtils'
import OrderTimeline from '@/storefront/components/orders/OrderTimeline'
import { storefrontAPI } from '@/shared/services/api'

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)
  const cancelMutation = useCancelOrder()

  const canCancel = !['SHIPPED', 'DELIVERED', 'CANCELLED'].includes((order.tracking_status || '').toUpperCase())

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return
    try {
      await cancelMutation.mutateAsync(order.id)
      toast.success('Order cancelled')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to cancel order')
    }
  }

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true)
    try {
      const response = await storefrontAPI.downloadInvoice(order.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Invoice-${order.order_number}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Invoice downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download invoice')
    } finally {
      setDownloadingInvoice(false)
    }
  }

  return (
    <div className="bg-app border border-app rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left"
      >
        <div className="w-14 h-16 rounded-xl bg-surface overflow-hidden border border-app shrink-0">
          {order.product_image ? (
            <img src={getImageUrl(order.product_image)} alt={order.product_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-[10px]">No Image</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-app line-clamp-1">{order.product_name}</p>
          <p className="text-xs text-muted">
            {order.order_number} · {new Date(order.ordered_at || order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <span
            className={clsx(
              'inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mt-1.5',
              order.tracking_status === 'DELIVERED' && 'bg-green-500/15 text-green-600',
              order.tracking_status === 'CANCELLED' && 'bg-red-500/15 text-red-500',
              !['DELIVERED', 'CANCELLED'].includes(order.tracking_status) && 'bg-brand-500/15 text-brand-500'
            )}
          >
            {order.tracking_status}
          </span>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-app">{formatPrice(order.total_amount)}</p>
          <p className="text-xs text-muted">Qty: {order.quantity}</p>
        </div>

        {expanded ? <ChevronUp size={18} className="text-muted shrink-0" /> : <ChevronDown size={18} className="text-muted shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-app p-4 sm:p-5 flex flex-col gap-5">
          <OrderTimeline status={order.tracking_status} expectedDeliveryDate={order.expected_delivery_date} />

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted mb-1">Shipping Address</p>
              <p className="text-app font-medium">
                {order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}<br />
                {order.city}, {order.state} - {order.pincode}
              </p>
            </div>
            <div>
              <p className="text-muted mb-1">Payment</p>
              <p className="text-app font-medium">{order.payment_method} · {order.payment_status}</p>
              {order.size && <p className="text-app font-medium mt-1">Size: {order.size}{order.color ? ` · Color: ${order.color}` : ''}</p>}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link
              to={`/orders/${order.id}`}
              className="flex-1 text-center border border-app rounded-full py-2.5 text-sm font-semibold text-app hover:bg-surface transition-colors"
            >
              View Details
            </Link>
            <button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="flex-1 inline-flex items-center justify-center gap-1.5 border border-brand-500/30 text-brand-500 rounded-full py-2.5 text-sm font-semibold hover:bg-brand-500/5 transition-colors disabled:opacity-60"
            >
              <Download size={14} />
              {downloadingInvoice ? 'Downloading…' : 'Download Invoice'}
            </button>
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 border border-red-500/30 text-red-500 rounded-full py-2.5 text-sm font-semibold hover:bg-red-500/5 transition-colors disabled:opacity-60"
              >
                <XCircle size={14} /> Cancel Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default function OrdersList() {
  const { data, isLoading } = useMyOrders()

  console.log("Orders API Response:", data)

  const orders = Array.isArray(data)
    ? data
    : Array.isArray(data?.orders)
    ? data.orders
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : []

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center">
          <Package size={28} className="text-muted" />
        </div>

        <h1 className="font-display font-bold text-xl text-app">
          No orders yet
        </h1>

        <p className="text-sm text-muted max-w-sm">
          When you place an order, it'll show up here.
        </p>

        <Link
          to="/products"
          className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-glow-sm transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-app mb-8">
        My Orders
      </h1>

      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}