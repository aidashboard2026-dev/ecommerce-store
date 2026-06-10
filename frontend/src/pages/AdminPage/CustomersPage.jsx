import React, { useState } from 'react'
import { Plus, Search, UserRound, Mail, ShoppingBag } from 'lucide-react'
import Badge from '../../components/common/Badge'

const CUSTOMERS = [
  { id: 1, name: 'Priya Kumar', email: 'priya@example.com', orders: 12, spent: 1840, status: 'vip' },
  { id: 2, name: 'Arun Patel', email: 'arun@example.com', orders: 7, spent: 920, status: 'active' },
  { id: 3, name: 'Nisha Rao', email: 'nisha@example.com', orders: 3, spent: 318, status: 'active' },
  { id: 4, name: 'Kiran Shah', email: 'kiran@example.com', orders: 1, spent: 129, status: 'new' },
]

const statusBadge = {
  vip: 'success',
  active: 'info',
  new: 'warning',
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const filtered = CUSTOMERS.filter((customer) =>
    `${customer.name} ${customer.email} ${customer.status}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-app">Customers</h1>
          <p className="text-muted text-sm mt-1">{CUSTOMERS.length} customers with recent activity</p>
        </div>
        <button className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input-field pl-10"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-app">
          {filtered.map((customer) => (
            <div key={customer.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <UserRound size={18} />
                </div>
                <div>
                  <p className="font-semibold text-app text-sm">{customer.name}</p>
                  <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                    <Mail size={12} />
                    {customer.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span className="text-xs text-muted flex items-center gap-1.5">
                  <ShoppingBag size={13} />
                  {customer.orders} orders
                </span>
                <span className="font-display font-bold text-app">${customer.spent.toLocaleString()}</span>
                <Badge label={customer.status} variant={statusBadge[customer.status]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
