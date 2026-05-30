import React, { useState } from 'react'
import { Package, Search, Plus, Star, TrendingUp, TrendingDown } from 'lucide-react'
import Badge from '../components/common/Badge'

// Static demo data
const PRODUCTS = [
  { id: 1, name: 'Pro Dashboard License', category: 'Software', price: 299, stock: 9999, status: 'active', rating: 4.9, sales: 1284 },
  { id: 2, name: 'Analytics Suite', category: 'Software', price: 149, stock: 9999, status: 'active', rating: 4.7, sales: 876 },
  { id: 3, name: 'API Access Token', category: 'Service', price: 49, stock: 500, status: 'active', rating: 4.8, sales: 3201 },
  { id: 4, name: 'Enterprise Support', category: 'Service', price: 999, stock: 20, status: 'limited', rating: 5.0, sales: 45 },
  { id: 5, name: 'Mobile SDK', category: 'Developer', price: 79, stock: 9999, status: 'active', rating: 4.5, sales: 612 },
  { id: 6, name: 'Data Export Tool', category: 'Software', price: 59, stock: 0, status: 'out_of_stock', rating: 4.2, sales: 298 },
  { id: 7, name: 'White Label License', category: 'License', price: 1499, stock: 10, status: 'limited', rating: 4.8, sales: 31 },
  { id: 8, name: 'Team Collaboration Add-on', category: 'Software', price: 99, stock: 9999, status: 'active', rating: 4.6, sales: 547 },
]

const statusBadge = {
  active: 'success',
  limited: 'warning',
  out_of_stock: 'danger',
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const categories = ['all', ...new Set(PRODUCTS.map((p) => p.category))]

  const filtered = PRODUCTS.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.category === filter
    return matchSearch && matchFilter
  })

  const totalRevenue = PRODUCTS.reduce((sum, p) => sum + p.price * p.sales, 0)

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-app">Products</h1>
          <p className="text-muted text-sm mt-1">
            {PRODUCTS.length} products · ${(totalRevenue / 1000).toFixed(0)}k total revenue
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input-field pl-10"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-2 text-sm rounded-xl font-medium capitalize transition-all duration-150 ${
                filter === c
                  ? 'bg-brand-500 text-white shadow-glow-sm'
                  : 'bg-surface text-muted hover:text-app border border-app'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <div key={product.id} className="card p-5 flex flex-col gap-3 group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-950 dark:to-brand-900 flex items-center justify-center">
                <Package size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <Badge label={product.status.replace('_', ' ')} variant={statusBadge[product.status]} />
            </div>

            <div>
              <p className="font-semibold text-app text-sm leading-snug">{product.name}</p>
              <p className="text-xs text-muted mt-0.5">{product.category}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-app">
              <span className="font-display font-bold text-lg text-app">${product.price}</span>
              <div className="flex items-center gap-1 text-xs text-muted">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                {product.rating}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted">
              <span>{product.sales.toLocaleString()} sales</span>
              <span className={product.stock === 0 ? 'text-red-500' : product.stock < 50 ? 'text-amber-500' : 'text-emerald-500'}>
                {product.stock === 0 ? 'Out of stock' : product.stock === 9999 ? 'Unlimited' : `${product.stock} left`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center text-muted">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No products found</p>
        </div>
      )}
    </div>
  )
}
