import React, { useState } from 'react'
import { Plus, Search, Tags, CalendarDays, Percent } from 'lucide-react'
import Badge from '../components/common/Badge'

const OFFERS = [
  { id: 1, name: 'Summer Sale', code: 'SUMMER25', discount: '25%', status: 'active', ends: 'Jun 30' },
  { id: 2, name: 'First Order', code: 'WELCOME10', discount: '10%', status: 'active', ends: 'Dec 31' },
  { id: 3, name: 'Clearance Deal', code: 'CLEAR40', discount: '40%', status: 'scheduled', ends: 'Jul 15' },
  { id: 4, name: 'Free Shipping', code: 'FREESHIP', discount: 'Shipping', status: 'paused', ends: 'Aug 01' },
]

const statusBadge = {
  active: 'success',
  scheduled: 'info',
  paused: 'warning',
}

export default function OffersPage() {
  const [search, setSearch] = useState('')
  const filtered = OFFERS.filter((offer) =>
    `${offer.name} ${offer.code} ${offer.status}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-app">Offers</h1>
          <p className="text-muted text-sm mt-1">Manage discounts, coupons, and campaign windows</p>
        </div>
        <button className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={16} />
          Add Offer
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input-field pl-10"
          placeholder="Search offers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((offer) => (
          <div key={offer.id} className="card p-5 space-y-4 hover:-translate-y-0.5 transition-transform duration-200">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Tags size={18} />
              </div>
              <Badge label={offer.status} variant={statusBadge[offer.status]} />
            </div>
            <div>
              <p className="font-semibold text-app text-sm">{offer.name}</p>
              <p className="text-xs text-muted mt-0.5">{offer.code}</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-app text-sm">
              <span className="flex items-center gap-1.5 text-app font-semibold">
                <Percent size={14} className="text-muted" />
                {offer.discount}
              </span>
              <span className="flex items-center gap-1.5 text-muted text-xs">
                <CalendarDays size={14} />
                {offer.ends}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
