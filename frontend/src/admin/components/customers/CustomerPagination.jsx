import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import Select from '@/shared/components/ui/Select'

export default function CustomerPagination({ page, pages, perPage, total, onPage, onPerPage }) {
  if (!total) return null

  const start = (page - 1) * perPage + 1
  const end   = Math.min(page * perPage, total)

  // Build page numbers — show max 7 slots
  const getPages = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const near = new Set([1, pages, page - 1, page, page + 1].filter(p => p >= 1 && p <= pages))
    const arr = [...near].sort((a, b) => a - b)
    const result = []
    for (let i = 0; i < arr.length; i++) {
      if (i > 0 && arr[i] - arr[i - 1] > 1) result.push('…')
      result.push(arr[i])
    }
    return result
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-1">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span>Showing {start}–{end} of {total.toLocaleString()}</span>
        <Select
          value={perPage}
          onChange={e => onPerPage(Number(e.target.value))}
          className="w-auto text-sm py-1.5 min-w-[120px]"
          options={[10, 20, 50, 100].map(n => ({ value: n, label: `${n} per page` }))}
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={clsx(
                'w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                page === p
                  ? 'bg-brand-500 text-white'
                  : 'border border-app text-muted hover:text-app hover:bg-surface'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
