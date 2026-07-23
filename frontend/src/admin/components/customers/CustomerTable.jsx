import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Eye, Edit2, ToggleLeft, ToggleRight, MoreVertical,
  ChevronUp, ChevronDown, ChevronsUpDown, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Badge from '@/shared/components/ui/Badge'
import Avatar from '@/shared/components/ui/Avatar'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from '@/shared/components/ui/Table'
import { customersAPI } from '@/shared/services/api'
import { getApiErrorMessage } from '@/shared/utils/productUtils'

// ─── Sort header ──────────────────────────────────────────────────────────────
function SortHeader({ label, col, sortBy, sortDir, onSort }) {
  const active = sortBy === col
  return (
    <button
      onClick={() => onSort(col)}
      className={clsx(
        'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors',
        active ? 'text-brand-500' : 'text-muted hover:text-app'
      )}
    >
      {label}
      {active ? (
        sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
      ) : (
        <ChevronsUpDown size={11} className="opacity-40" />
      )}
    </button>
  )
}

// ─── Row actions menu ─────────────────────────────────────────────────────────
function RowActions({ customer, onView, onEdit, onStatusToggle }) {
  const [open, setOpen] = useState(false)
  const menuRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1 rounded-lg hover:bg-app text-muted hover:text-app transition-colors"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-44 bg-surface border border-app rounded-xl shadow-elevated overflow-hidden animate-slide-up">
          {[
            { label: 'View Profile', icon: Eye, action: () => { onView(); setOpen(false) } },
            { label: 'Edit Info', icon: Edit2, action: () => { onEdit(); setOpen(false) } },
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
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-app',
                danger ? 'text-red-500 hover:bg-red-500/5' : 'text-app'
              )}
            >
              <Icon size={13} className={clsx(danger ? 'text-red-500' : 'text-muted')} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-app animate-pulse">
      {[16, 28, 20, 10, 12, 10, 16, 12, 16, 16, 6].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className={clsx('h-3.5 bg-app border border-app/50 rounded', `w-${w}`)} />
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
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update status')),
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
      <Table className="min-w-[1000px]">
        <TableHeader>
          <tr>
            {COLS.map(({ label, col }) => (
              <TableHead key={label || 'actions'} className="px-4 py-3">
                {col ? (
                  <SortHeader label={label} col={col} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
                )}
              </TableHead>
            ))}
          </tr>
        </TableHeader>
        <TableBody >
          {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          {!isLoading && customers.length === 0 && (
            <tr className="hover:bg-transparent">
              <td colSpan={11} >
                <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 text-muted">
                  <div className="w-12 h-12 rounded-xl bg-app  border border-app flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <p className="font-bold text-app text-sm">No customers matched filters</p>
                  <p className="text-xs">Adjust your search parameters or tag filters.</p>
                </div>
              </td>
            </tr>
          )}
          {!isLoading && customers.map(customer => (
            <TableRow
              key={customer.id}
              onClick={() => onViewProfile(customer)}
            >
              {/* Avatar + Name */}
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar size="sm" firstName={customer.first_name} lastName={customer.last_name} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-app whitespace-nowrap">
                      {customer.first_name} {customer.last_name}
                    </p>
                    {customer.city && (
                      <p className="text-[10px] text-muted font-medium truncate max-w-[120px] mt-0.5">
                        {[customer.city, customer.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Email */}
              <TableCell className="py-3">
                <span className="text-xs text-muted truncate max-w-[180px] block">{customer.email}</span>
              </TableCell>

              {/* Phone */}
              <TableCell className="py-3">
                <span className="text-xs text-muted">{customer.phone || '—'}</span>
              </TableCell>

              {/* Orders */}
              <TableCell className="py-3">
                <span className="text-xs font-bold text-app">{customer.total_orders ?? 0}</span>
              </TableCell>

              {/* Total Spent */}
              <TableCell className="py-3">
                <span className="text-xs font-bold text-app">{fmt(customer.total_spent)}</span>
              </TableCell>

              {/* AOV */}
              <TableCell className="py-3">
                <span className="text-xs text-muted">{fmt(customer.average_order_value)}</span>
              </TableCell>

              {/* Last Order */}
              <TableCell className="py-3">
                <span className="text-xs text-muted whitespace-nowrap">{fmtDate(customer.last_order_date)}</span>
              </TableCell>

              {/* Status */}
              <TableCell className="py-3" onClick={e => e.stopPropagation()}>
                <Badge
                  label={customer.is_active ? 'Active' : 'Inactive'}
                  variant={customer.is_active ? 'success' : 'default'}
                  dot
                />
              </TableCell>

              {/* Tags */}
              <TableCell className="py-3">
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
              </TableCell>

              {/* Joined */}
              <TableCell className="py-3">
                <span className="text-xs text-muted whitespace-nowrap">{fmtDate(customer.created_at)}</span>
              </TableCell>

              {/* Actions */}
              <TableCell className="py-3" onClick={e => e.stopPropagation()}>
                <RowActions
                  customer={customer}
                  onView={() => onViewProfile(customer)}
                  onEdit={() => onEdit(customer)}
                  onStatusToggle={() => statusMutation.mutate({ id: customer.id, is_active: !customer.is_active })}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </div>
  )
}

