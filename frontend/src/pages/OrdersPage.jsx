import React, { useState } from 'react'
import { Search, ShoppingCart, Truck, Clock, CheckCircle2, Plus } from 'lucide-react'
import Badge from '../components/common/Badge'

const ORDERS = [
  { id: 'ORD-1048', customer: 'Priya Kumar', items: 3, total: 249.99, status: 'processing', payment: 'Paid' },
  { id: 'ORD-1047', customer: 'Arun Patel', items: 1, total: 89.5, status: 'shipped', payment: 'Paid' },
  { id: 'ORD-1046', customer: 'Nisha Rao', items: 5, total: 412.0, status: 'delivered', payment: 'Paid' },
  { id: 'ORD-1045', customer: 'Kiran Shah', items: 2, total: 128.75, status: 'pending', payment: 'COD' },
]

const statusBadge = {
  pending: 'warning',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
}

const statusIcon = {
  pending: Clock,
  processing: ShoppingCart,
  shipped: Truck,
  delivered: CheckCircle2,
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const filtered = ORDERS.filter((order) =>
    `${order.id} ${order.customer} ${order.status}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-app">Orders</h1>
          <p className="text-muted text-sm mt-1">{ORDERS.length} recent orders ready for review</p>
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
          {filtered.map((order) => {
            const Icon = statusIcon[order.status] || ShoppingCart
            return (
              <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-app text-sm">{order.id}</p>
                    <p className="text-xs text-muted">{order.customer} - {order.items} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="font-display font-bold text-app">${order.total.toFixed(2)}</span>
                  <Badge label={order.status} variant={statusBadge[order.status]} />
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
