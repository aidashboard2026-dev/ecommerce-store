import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Eye, Edit2, ToggleLeft, ToggleRight, MoreVertical,
  ChevronUp, ChevronDown, ChevronsUpDown, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Badge from '../common/Badge'
import { customersAPI } from '../../services/api'

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ firstName, lastName }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  const hues = ['bg-violet-100 text-violet-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-rose-100 text-rose-600']
  const color = hues[(firstName?.charCodeAt(0) ?? 0) % hues.length]
  return (
    <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 dark:bg-opacity-20', color)}>
      {initials || <User size={14} />}
    </div>
  )
}

// ─── Sort header ──────────────────────────────────────────────────────────────
function SortHeader({ label, col, sortBy, sortDir, onSort }) {
  const active = sortBy === col
  return (
    <button
      onClick={() => onSort(col)}
      className={clsx(
        'flex items-center gap-1 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors',
        active ? 'text-brand-500' : 'text-muted hover:text-app'
      )}
    >
      {label}
      {active ? (
        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ChevronsUpDown size={12} className="opacity-40" />
      )}
    </button>
  )
}

// ─── Row actions menu ─────────────────────────────────────────────────────────
function RowActions({ customer, onView, onEdit, onStatusToggle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-app transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-app border border-app rounded-xl shadow-lg overflow-hidden">
            {[
              { label: 'View Profile', icon: Eye, action: () => { onView(); setOpen(false) } },
              { label: 'Edit', icon: Edit2, action: () => { onEdit(); setOpen(false) } },
              {
                label: customer.is_active ? 'Deactivate' : 'Activate',
                icon: customer.is_active ? ToggleLeft : ToggleRight,
                action: () => { onStatusToggle(); setOpen(false) },
                danger: customer.is_active,
              },
            ].map(({ label, icon: Icon, action, danger }) => (
              <button
                key={label}
                onClick={action}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface',
                  danger ? 'text-red-500 hover:text-red-600' : 'text-app'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-app animate-pulse">
      {[8, 40, 32, 20, 16, 20, 16, 20, 16, 20, 8].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className={clsx('h-4 bg-surface rounded', `w-${w}`)} />
        </td>
      ))}
    </tr>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function CustomerTable({
  customers = [],
  isLoading = false,
  sortBy,
  sortDir,
  onSort,
  onViewProfile,
  onEdit,
}) {
  const qc = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }) => customersAPI.setStatus(id, is_active),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['customers'])
      toast.success(vars.is_active ? 'Customer activated' : 'Customer deactivated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const COLS = [
    { label: 'Customer', col: 'first_name' },
    { label: 'Email', col: 'email' },
    { label: 'Phone', col: null },
    { label: 'Orders', col: 'total_orders' },
    { label: 'Total Spent', col: 'total_spent' },
    { label: 'AOV', col: null },
    { label: 'Last Order', col: 'last_order_date' },
    { label: 'Status', col: null },
    { label: 'Tags', col: null },
    { label: 'Joined', col: 'created_at' },
    { label: '', col: null },
  ]

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-app bg-surface">
              {COLS.map(({ label, col }) => (
                <th key={label || 'actions'} className="px-4 py-3 text-left">
                  {col ? (
                    <SortHeader label={label} col={col} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading && customers.length === 0 && (
              <tr>
                <td colSpan={11} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted">
                    <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <p className="font-semibold text-app">No customers found</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && customers.map(customer => (
              <tr
                key={customer.id}
                className="border-b border-app hover:bg-surface/60 transition-colors cursor-pointer"
                onClick={() => onViewProfile(customer)}
              >
                {/* Avatar + Name */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={customer.first_name} lastName={customer.last_name} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app whitespace-nowrap">
                        {customer.first_name} {customer.last_name}
                      </p>
                      {customer.city && (
                        <p className="text-xs text-muted truncate max-w-[120px]">
                          {[customer.city, customer.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-muted truncate max-w-[180px] block">{customer.email}</span>
                </td>

                {/* Phone */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-muted">{customer.phone || '—'}</span>
                </td>

                {/* Orders */}
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-app">{customer.total_orders ?? 0}</span>
                </td>

                {/* Total Spent */}
                <td className="px-4 py-3.5">
                  <span className="text-sm font-bold font-display text-app">{fmt(customer.total_spent)}</span>
                </td>

                {/* AOV */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-muted">{fmt(customer.average_order_value)}</span>
                </td>

                {/* Last Order */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-muted whitespace-nowrap">{fmtDate(customer.last_order_date)}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                  <Badge
                    label={customer.is_active ? 'Active' : 'Inactive'}
                    variant={customer.is_active ? 'success' : 'default'}
                    dot
                  />
                </td>

                {/* Tags */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1 max-w-[120px]">
                    {(customer.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400">
                        {tag}
                      </span>
                    ))}
                    {(customer.tags?.length ?? 0) > 2 && (
                      <span className="text-[10px] text-muted">+{customer.tags.length - 2}</span>
                    )}
                  </div>
                </td>

                {/* Joined */}
                <td className="px-4 py-3.5">
                  <span className="text-xs text-muted whitespace-nowrap">{fmtDate(customer.created_at)}</span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                  <RowActions
                    customer={customer}
                    onView={() => onViewProfile(customer)}
                    onEdit={() => onEdit(customer)}
                    onStatusToggle={() => statusMutation.mutate({ id: customer.id, is_active: !customer.is_active })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
