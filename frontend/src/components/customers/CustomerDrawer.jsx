import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, Mail, Phone, MapPin, Calendar, ShoppingBag,
  TrendingUp, Tag, FileText, Edit2, Check, Clock,
  Package, CreditCard, AlertCircle, User, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import Drawer from '../ui/Drawer'
import { customersAPI } from '../../services/api'
import { getImageUrl } from '../../utils/productUtils'

// ─── Status Badge ─────────────────────────────────────────────────────────────
function CustomerStatusBadge({ isActive }) {
  return (
    <Badge
      label={isActive ? 'Active' : 'Inactive'}
      variant={isActive ? 'success' : 'default'}
      dot
    />
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-surface rounded-xl border border-app p-4">
      <div className="flex items-center gap-2 text-muted mb-1">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold font-display text-app">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Order status badge ───────────────────────────────────────────────────────
const orderStatusVariant = {
  PLACED: 'info', CONFIRMED: 'info', SHIPPED: 'warning',
  DELIVERED: 'success', CANCELLED: 'danger',
}

// ─── Tags editor ──────────────────────────────────────────────────────────────
function TagsEditor({ customerId, initialTags, onUpdate }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')

  const mutation = useMutation({
    mutationFn: (tags) => customersAPI.updateTags(customerId, tags),
    onSuccess: () => {
      qc.invalidateQueries(['customer-profile', customerId])
      qc.invalidateQueries(['customers'])
      onUpdate?.()
      toast.success('Tags updated')
      setEditing(false)
    },
    onError: () => toast.error('Failed to update tags'),
  })

  const handleAdd = () => {
    const tag = input.trim().toLowerCase()
    if (!tag || initialTags.includes(tag)) { setInput(''); return }
    mutation.mutate([...initialTags, tag])
    setInput('')
  }

  const handleRemove = (tag) => {
    mutation.mutate(initialTags.filter(t => t !== tag))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {initialTags.length === 0 && <span className="text-xs text-muted">No tags</span>}
        {initialTags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400">
            {tag}
            <button onClick={() => handleRemove(tag)} className="hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input
            autoFocus
            className="input-field py-1.5 text-sm"
            placeholder="Add tag..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="btn-primary py-1.5 px-3 text-sm">Add</button>
          <button onClick={() => setEditing(false)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-brand-500 hover:underline flex items-center gap-1">
          <Tag size={12} /> Add tag
        </button>
      )}
    </div>
  )
}

// ─── Notes editor ─────────────────────────────────────────────────────────────
function NotesEditor({ customerId, initialNotes, onUpdate }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialNotes || '')

  const mutation = useMutation({
    mutationFn: (notes) => customersAPI.updateNotes(customerId, notes),
    onSuccess: () => {
      qc.invalidateQueries(['customer-profile', customerId])
      qc.invalidateQueries(['customers'])
      onUpdate?.()
      toast.success('Notes saved')
      setEditing(false)
    },
    onError: () => toast.error('Failed to save notes'),
  })

  return (
    <div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            rows={4}
            className="input-field text-sm resize-none"
            placeholder="Internal notes about this customer..."
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => mutation.mutate(value)} disabled={mutation.isPending} className="btn-primary py-1.5 px-3 text-sm">
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="min-h-[56px] rounded-xl border border-dashed border-app p-3 text-sm text-muted cursor-pointer hover:border-brand-400 hover:text-app transition-colors"
        >
          {value || <span className="italic">Click to add notes...</span>}
        </div>
      )}
    </div>
  )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────
export default function CustomerDrawer({ customerId, onClose, onStatusChange }) {
  const qc = useQueryClient()

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['customer-profile', customerId],
    queryFn: () => customersAPI.profile(customerId).then(r => r.data),
    enabled: !!customerId,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }) => customersAPI.setStatus(id, is_active),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['customer-profile', customerId])
      qc.invalidateQueries(['customers'])
      toast.success(vars.is_active ? 'Customer activated' : 'Customer deactivated')
      onStatusChange?.()
    },
    onError: () => toast.error('Failed to update status'),
  })

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title="Customer Profile"
      subtitle={profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
      size="lg"
    >
      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm">Failed to load customer profile.</p>
          </div>
        )}

        {profile && (
          <>
            {/* Identity */}
            <div className="flex items-start gap-4">
              <Avatar firstName={profile.first_name} lastName={profile.last_name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-xl text-app">{profile.first_name} {profile.last_name}</h3>
                  <CustomerStatusBadge isActive={profile.is_active} />
                </div>
                <p className="text-sm text-muted mt-0.5">Customer since {fmtDate(profile.created_at)}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted">
                  {profile.email && <span className="flex items-center gap-1"><Mail size={12} />{profile.email}</span>}
                  {profile.phone && <span className="flex items-center gap-1"><Phone size={12} />{profile.phone}</span>}
                  {(profile.city || profile.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {profile.dob && <span className="flex items-center gap-1"><Calendar size={12} />DOB: {fmtDate(profile.dob)}</span>}
                </div>
              </div>
            </div>
            {/* Toggle status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-app">
              <div>
                <p className="text-sm font-semibold text-app">Account Status</p>
                <p className="text-xs text-muted">
                  {profile.is_active
                    ? 'Customer can place orders'
                    : 'Customer is deactivated'}
                </p>
              </div>
              <button
                onClick={() =>
                  statusMutation.mutate({
                    id: profile.id,
                    is_active: !profile.is_active,
                  })
                }
                disabled={statusMutation.isPending}
                className={clsx(
                  'text-xs font-semibold px-4 py-2 rounded-xl transition-all',
                  profile.is_active
                    ? 'bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100'
                )}
              >
                {profile.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>

            {/* Spending stats */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Spending Overview
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={ShoppingBag}
                  label="Total Orders"
                  value={profile.total_orders}
                />
                <StatTile
                  icon={CreditCard}
                  label="Total Spent"
                  value={fmt(profile.total_spent)}
                />
                <StatTile
                  icon={TrendingUp}
                  label="Avg. Order Value"
                  value={fmt(profile.average_order_value)}
                />
                <StatTile
                  icon={Clock}
                  label="Last Order"
                  value={fmtDate(profile.last_order_date)}
                />
              </div>
            </div>

            {/* Recent orders */}
            {profile.recent_orders?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                  Recent Orders
                </p>
                <div className="space-y-2">
                  {profile.recent_orders.map(order => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-app hover:border-brand-400 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {order.product_image ? (
                          <img
                            src={getImageUrl(order.product_image)}
                            alt={order.product_name}
                            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.visibility = 'hidden'
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-app flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-muted" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-app truncate">
                            {order.order_number}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {order.product_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold font-display text-app">
                          {fmt(order.total_amount)}
                        </p>
                        <Badge
                          label={order.tracking_status}
                          variant={
                            orderStatusVariant[order.tracking_status] ||
                            'default'
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Tags */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Tags</p>
              <TagsEditor
                customerId={profile.id}
                initialTags={profile.tags || []}
                onUpdate={() => qc.invalidateQueries(['customers'])}
              />
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                <span className="flex items-center gap-1.5"><FileText size={12} />Internal Notes</span>
              </p>
              <NotesEditor
                customerId={profile.id}
                initialNotes={profile.notes}
                onUpdate={() => qc.invalidateQueries(['customers'])}
              />
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
