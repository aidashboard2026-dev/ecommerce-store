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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className="input-field pl-10 pr-10"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl border border-app overflow-hidden bg-app">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onStatusFilter(value)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium transition-colors',
                statusFilter === value
                  ? 'bg-brand-500 text-white'
                  : 'text-muted hover:text-app hover:bg-surface'
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
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted hover:text-red-500 rounded-xl border border-app hover:border-red-300 transition-colors"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted flex items-center gap-1"><Filter size={11} />Filter by tag:</span>
        {COMMON_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => onTagFilter(tagFilter === tag ? '' : tag)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              tagFilter === tag
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-app text-muted border-app hover:border-brand-400 hover:text-app'
            )}
          >
            {tag}
          </button>
        ))}
        {tagFilter && !COMMON_TAGS.includes(tagFilter) && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500 text-white">
            {tagFilter} <button onClick={() => onTagFilter('')} className="ml-1">×</button>
          </span>
        )}
      </div>

      {/* Result count */}
      {total !== undefined && (
        <p className="text-xs text-muted">
          {total.toLocaleString()} {total === 1 ? 'customer' : 'customers'} found
        </p>
      )}
    </div>
  )
}
