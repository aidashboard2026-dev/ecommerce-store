import React from 'react'
import { Search, X } from 'lucide-react'
import clsx from 'clsx'

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className,
  ...props
}) {
  return (
    <div className={clsx('relative w-full max-w-md', className)}>
      {/* Search Icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
        <Search size={16} />
      </span>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-app bg-surface py-2 pl-10 pr-10 text-sm text-app outline-none transition-all placeholder:text-muted/50 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        {...props}
      />

      {/* Clear Button */}
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}