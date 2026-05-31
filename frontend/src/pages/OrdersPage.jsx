import React, { useEffect, useState } from 'react'
import { Search, ShoppingCart, Truck, Clock, CheckCircle2, Plus, XCircle } from 'lucide-react'

import Badge from '../components/common/Badge'
import { ordersAPI } from '../services/api'

const statusBadge = {
  pending: 'warning',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
}

const statusIcon = {
  pending: Clock,
  processing: ShoppingCart,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0)

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadOrders() {
      try {
        const response = await ordersAPI.list()
        if (active) setOrders(response.data)
      } catch (error) {
        console.error(error)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOrders()
    const refreshTimer = window.setInterval(loadOrders, 15000)
    window.addEventListener('focus', loadOrders)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', loadOrders)
    }
  }, [])

  const filtered = orders.filter((order) =>
    `${order.order_number} ${order.customer} ${order.status}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-app">Orders</h1>
          <p className="text-muted text-sm mt-1">{orders.length} orders synced from the database</p>
        </div>
        <button className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={16} />
          New Order
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input-field pl-10"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-app">
          {loading && (
            <div className="p-6 text-sm text-muted">Loading orders...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-6 text-sm text-muted">No matching orders found.</div>
          )}

          {filtered.map((order) => {
            const Icon = statusIcon[order.status] || ShoppingCart
            return (
              <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-app text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted">{order.customer} - {order.items} items</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span className="font-display font-bold text-app">{formatCurrency(order.total)}</span>
                  <Badge label={order.status} variant={statusBadge[order.status] || 'info'} />
                  <span className="text-xs text-muted min-w-10">{order.payment}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
