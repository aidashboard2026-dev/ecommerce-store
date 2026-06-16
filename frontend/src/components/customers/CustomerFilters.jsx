import React from 'react'
import { Search, Filter, X } from 'lucide-react'
import clsx from 'clsx'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const COMMON_TAGS = ['vip', 'wholesale', 'returner', 'new', 'at-risk']

export default function CustomerFilters({
  search, onSearch,
  statusFilter, onStatusFilter,
  tagFilter, onTagFilter,
  total,
  onClearAll,
}) {
  const hasFilters = search || statusFilter || tagFilter

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className="input-field pl-9.5 pr-10 text-xs py-2"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl border border-app overflow-hidden bg-app/50 p-1 w-fit">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onStatusFilter(value)}
              className={clsx(
                'px-3.5 py-1 text-xs font-semibold rounded-lg transition-all active:scale-[0.98]',
                statusFilter === value
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
                  : 'text-muted hover:text-app'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted hover:text-red-500 rounded-xl border border-app hover:border-red-500/20 hover:bg-red-500/5 transition-colors"
          >
            <X size={13} /> Clear Filters
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] text-muted flex items-center gap-1 font-semibold"><Filter size={11} />Filter by tag:</span>
        {COMMON_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => onTagFilter(tagFilter === tag ? '' : tag)}
            className={clsx(
              'px-3 py-0.5 rounded-full text-[11px] font-bold border transition-colors',
              tagFilter === tag
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-surface text-muted border-app hover:border-brand-500/40 hover:text-app'
            )}
          >
            {tag}
          </button>
        ))}
        {tagFilter && !COMMON_TAGS.includes(tagFilter) && (
          <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-brand-500 text-white">
            {tagFilter} <button onClick={() => onTagFilter('')} className="ml-1 font-semibold">×</button>
          </span>
        )}
      </div>

      {/* Result count */}
      {total !== undefined && (
        <p className="text-[11px] font-semibold text-muted tracking-wide">
          {total.toLocaleString()} {total === 1 ? 'customer' : 'customers'} found
        </p>
      )}
    </div>
  )
}
