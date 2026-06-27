import React from 'react'
import clsx from 'clsx'
import { SlidersHorizontal, X } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

const PRICE_RANGES = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 – ₹2,500', min: 1000, max: 2500 },
  { label: '₹2,500 – ₹5,000', min: 2500, max: 5000 },
  { label: 'Above ₹5,000', min: 5000, max: null },
]

const RATINGS = [4, 3, 2]

export default function ProductFilters({
  collections = [],
  filters,
  onChange,
  onReset,
  className,
  isOpen,
  onClose,
}) {
  const update = (patch) => onChange({ ...filters, ...patch })

  const content = (
    <div className="flex flex-col gap-6">
      {/* Mobile header */}
      <div className="flex items-center justify-between lg:hidden">
        <h3 className="font-display font-bold text-base text-app flex items-center gap-2">
          <SlidersHorizontal size={16} /> Filters
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface text-app">
          <X size={18} />
        </button>
      </div>

      {/* Sort */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-3">Sort By</h4>
        <div className="flex flex-col gap-2">
          {SORT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-app cursor-pointer">
              <input
                type="radio"
                name="sort_by"
                checked={filters.sort_by === opt.value}
                onChange={() => update({ sort_by: opt.value })}
                className="accent-brand-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Category / Collection */}
      {collections.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-3">Category</h4>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-app cursor-pointer">
              <input
                type="radio"
                name="collection"
                checked={!filters.collection}
                onChange={() => update({ collection: '' })}
                className="accent-brand-500"
              />
              All Categories
            </label>
            {collections.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm text-app cursor-pointer">
                <input
                  type="radio"
                  name="collection"
                  checked={filters.collection === c}
                  onChange={() => update({ collection: c })}
                  className="accent-brand-500"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-3">Price</h4>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-app cursor-pointer">
            <input
              type="radio"
              name="price_range"
              checked={!filters.min_price && !filters.max_price}
              onChange={() => update({ min_price: '', max_price: '' })}
              className="accent-brand-500"
            />
            Any Price
          </label>
          {PRICE_RANGES.map((r) => (
            <label key={r.label} className="flex items-center gap-2 text-sm text-app cursor-pointer">
              <input
                type="radio"
                name="price_range"
                checked={String(filters.min_price) === String(r.min) && String(filters.max_price) === String(r.max ?? '')}
                onChange={() => update({ min_price: r.min, max_price: r.max ?? '' })}
                className="accent-brand-500"
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      {/* Rating (display-only, no backend field yet) */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-3">Customer Rating</h4>
        <div className="flex flex-col gap-2">
          {RATINGS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-app cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={filters.rating === r}
                onChange={() => update({ rating: filters.rating === r ? null : r })}
                className="accent-brand-500"
              />
              {r}★ & above
            </label>
          ))}
        </div>
      </div>

      {/* Stock */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-3">Availability</h4>
        <label className="flex items-center gap-2 text-sm text-app cursor-pointer">
          <input
            type="checkbox"
            checked={!!filters.in_stock_only}
            onChange={(e) => update({ in_stock_only: e.target.checked })}
            className="accent-brand-500"
          />
          In Stock Only
        </label>
      </div>

      <button
        onClick={onReset}
        className="text-xs font-semibold text-brand-500 hover:text-brand-600 text-left"
      >
        Clear All Filters
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={clsx('hidden lg:block w-64 shrink-0', className)}>
        <div className="sticky top-24 bg-app border border-app rounded-2xl p-5">{content}</div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={clsx(
          'fixed inset-0 z-50 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
        <div
          className={clsx(
            'absolute left-0 top-0 bottom-0 w-[280px] bg-app border-r border-app shadow-2xl p-5 overflow-y-auto transition-transform duration-300',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {content}
        </div>
      </div>
    </>
  )
}
