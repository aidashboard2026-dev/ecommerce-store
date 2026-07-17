/**
 * src/pages/AdminPage/ProductsPage.jsx
 * Enhanced with category, collection, stock status, and merchandising flag filters.
 * Adds bulk actions UI. Preserves existing UI/UX completely.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit, Eye, EyeOff, Package,
  Trash2, ChevronLeft, ChevronRight, CheckSquare,
  AlertTriangle, Layers, MoreVertical, ImageIcon, Loader2,
  TrendingUp, Star, Zap, ChevronDown, X, Tag, Settings2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  customProductsAPI as customProductsApi,
  customCategoriesAPI,
  // customCollectionsAPI
} from '@/shared/services/api'
import { formatPrice, getImageUrl, useDebounce, getApiErrorMessage } from '@/shared/utils/productUtils'
import CustomProductForm from '@/admin/components/products/CustomProductForm'
import ImageUploadModal from '@/admin/components/products/ImageUploadModal'
import CustomCategoryCollectionModel from '@/admin/components/products/CustomCategoryCollectionModel'
import QuickCustomCategoryEditModal from '@/admin/components/products/QuickCustomCategoryEditModal'
import Modal from '@/shared/components/common/Modal'
import PageHeader from '@/shared/components/ui/PageHeader'
import SearchBar from '@/shared/components/ui/SearchBar'
import Badge from '@/shared/components/ui/Badge'
import Button from '@/shared/components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/Table'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS  = ['draft', 'published', 'archived']
// STOCK_OPTIONS removed — Custom Printing domain has no inventory
const FLAG_OPTIONS = [
  { key: 'is_featured',    label: 'Featured',    icon: <Star size={11} /> },
  { key: 'is_trending',    label: 'Trending',    icon: <TrendingUp size={11} /> },
  { key: 'is_best_seller', label: 'Best Seller', icon: <Zap size={11} /> },
  { key: 'is_new_arrival', label: 'New',         icon: <Layers size={11} /> },
]
const BULK_ACTIONS = [
  { value: 'publish',         label: 'Publish' },
  { value: 'unpublish',       label: 'Unpublish' },
  { value: 'archive',         label: 'Archive' },
  { value: 'move_category',   label: 'Move to Category…' },
  { value: 'move_collection', label: 'Move to Collection…' },
  { value: 'delete',          label: 'Delete Selected', danger: true },
]

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ProductErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[ProductErrorBoundary]', error, info?.componentStack) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-4 text-center">
          <AlertTriangle size={20} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm font-semibold text-red-400">{this.props.title || 'Something went wrong'}</p>
          <p className="text-xs text-muted mt-1">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs underline text-muted hover:text-app">Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ImageStrip = React.memo(function ImageStrip({ thumbnail }) {
  const resolvedUrl = getImageUrl(thumbnail)
  return (
    <div className="w-8 h-9 rounded bg-surface flex-shrink-0 overflow-hidden border border-app">
      {resolvedUrl ? (
        <img src={resolvedUrl} alt="Product thumbnail" className="w-full h-full object-cover" loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none' }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package size={11} className="text-muted" />
        </div>
      )}
    </div>
  )
})

// StockBadge removed — Custom Printing domain has no stock

function DeleteButton({ onConfirm, loading }) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = React.useRef(null)
  const handleClick = () => {
    if (!confirming) { setConfirming(true); timerRef.current = setTimeout(() => setConfirming(false), 3000) }
    else { clearTimeout(timerRef.current); setConfirming(false); onConfirm() }
  }
  React.useEffect(() => () => clearTimeout(timerRef.current), [])
  return (
    <button onClick={handleClick} disabled={loading} title={confirming ? 'Confirm delete?' : 'Delete'}
      className={`btn-tbl-delete ${confirming ? 'confirming' : ''}`}>
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
    </button>
  )
}

const MobileActions = React.memo(function MobileActions({
  product,
  onEdit,
  onImage,
  onToggleStatus,
  onDelete,
  onCategoryEdit,
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  const item = (label, icon, action, danger = false) => (
    <button onClick={() => { setOpen(false); action() }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-app hover:bg-surface'}`}>
      {icon}{label}
    </button>
  )
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Product actions menu"
        className="p-2 rounded-lg text-muted hover:text-app hover:bg-surface transition-all">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-app bg-app shadow-xl z-50 overflow-hidden">
          {item('Edit', <Edit size={14} />, onEdit)}
          {item('Edit Category', <Tag size={14} />, onCategoryEdit)}
          {item(product.status === 'published' ? 'Unpublish' : 'Publish',
            product.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />, onToggleStatus)}
          {item('Delete', <Trash2 size={14} />, onDelete, true)}
        </div>
      )}
    </div>
  )
})

function ProductCard({ product, onEdit, onImage, onToggleStatus, onVariant, onDelete, onCategoryEdit, deleteLoading }) {
  const borderMap = { published: 'border-l-emerald-500', draft: 'border-l-slate-400', archived: 'border-l-amber-400' }
  return (
    <div className={`card p-3 space-y-2 border-l-4 ${borderMap[product.status] || 'border-l-slate-400'}`}>
      <div className="flex items-start gap-3">
        <ImageStrip thumbnail={product.thumbnail} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-app truncate">{product.title}</p>
          <p className="text-[10px] text-muted font-mono truncate">{product.category_name || product.collection || product.slug}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`status-pill ${product.status}`}>{product.status}</span>
            {product.is_featured    && <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded border border-amber-500/20">⭐ Featured</span>}
            {product.is_trending    && <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1 py-0.5 rounded border border-blue-500/20">🔥 Trending</span>}
            {product.is_best_seller && <span className="text-[9px] bg-purple-500/10 text-purple-500 px-1 py-0.5 rounded border border-purple-500/20">⚡ Best Seller</span>}
            {product.is_new_arrival && <span className="text-[9px] bg-green-500/10 text-green-500 px-1 py-0.5 rounded border border-green-500/20">🆕 New</span>}
          </div>
        </div>
        <MobileActions product={product} onEdit={() => onEdit(product)} onImage={() => onImage(product)}
          onToggleStatus={() => onToggleStatus(product)} onVariant={() => onVariant(product)}
          onDelete={() => onDelete(product)} onCategoryEdit={() => onCategoryEdit(product)} />
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
        className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-30 transition-all">
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs text-muted px-2 font-medium">Page {page} of {totalPages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
        className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-30 transition-all">
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({ active, label, onClick, onClear }) {
  return (
    <button onClick={onClick}
      className={clsx(
        'flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap',
        active
          ? 'bg-brand-500 text-white border-brand-500'
          : 'border-app text-muted hover:text-app hover:bg-surface'
      )}>
      {label}
      {active && (
        <span onClick={e => { e.stopPropagation(); onClear() }}
          className="ml-1 rounded-full bg-white/20 hover:bg-white/30 p-0.5 transition-all">
          <X size={9} />
        </span>
      )}
    </button>
  )
}

// ─── Bulk Actions Bar ────────────────────────────────────────────────────────

function BulkActionsBar({ selectedIds, onAction, categories, collections, onClear }) {
  const [open, setOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const [targetCollectionId, setTargetCollectionId] = useState('')
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const handleAction = (action) => {
    setOpen(false)
    if (action === 'move_category' || action === 'move_collection') {
      setPendingAction(action)
    } else {
      onAction(action, {})
    }
  }

  const confirmMove = () => {
    if (pendingAction === 'move_category') {
      onAction('move_category', { category_id: Number(targetCategoryId) })
    } else {
      onAction('move_collection', { collection_id: Number(targetCollectionId) })
    }
    setPendingAction(null)
    setTargetCategoryId('')
    setTargetCollectionId('')
  }

  if (selectedIds.size === 0) return null

  return (
    <div className="flex items-center gap-3 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-2.5">
      <span className="text-xs font-bold text-brand-500">{selectedIds.size} selected</span>
      <button onClick={onClear} className="text-xs text-muted hover:text-app underline">Clear</button>

      {pendingAction ? (
        <div className="flex items-center gap-2 ml-auto">
          {pendingAction === 'move_category' ? (
            <select value={targetCategoryId} onChange={e => setTargetCategoryId(e.target.value)}
              className="input-field py-1 text-xs">
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <select value={targetCollectionId} onChange={e => setTargetCollectionId(e.target.value)}
              className="input-field py-1 text-xs">
              <option value="">Select collection…</option>
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={confirmMove} disabled={pendingAction === 'move_category' ? !targetCategoryId : !targetCollectionId}
            className="btn-primary text-xs py-1 px-3 disabled:opacity-40">Confirm</button>
          <button onClick={() => setPendingAction(null)} className="text-xs text-muted hover:text-app">Cancel</button>
        </div>
      ) : (
        <div className="relative ml-auto" ref={ref}>
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 btn-secondary text-xs py-1 px-3">
            Actions <ChevronDown size={12} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-app bg-app shadow-xl z-50 overflow-hidden">
              {BULK_ACTIONS.map(a => (
                <button key={a.value} onClick={() => handleAction(a.value)}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    a.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-app hover:bg-surface'
                  )}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient()

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryId, setCategoryId]     = useState('')
  // const [collectionId, setCollectionId] = useState('')
  const [stockStatus, setStockStatus]   = useState('')
  const [flagFilters, setFlagFilters]   = useState({})
  const [page, setPage]                 = useState(1)
  const [selectedIds, setSelectedIds]   = useState(new Set())

  const debouncedSearch = useDebounce(search, 400)

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [formModal,      setFormModal]      = useState({ open: false, product: null })
//   const [variantModal,   setVariantModal]   = useState({ open: false, productId: null })
  const [imageModal,     setImageModal]     = useState({ open: false, product: null })
  const [manageModal,    setManageModal]    = useState(false)
  const [quickEditModal, setQuickEditModal] = useState({ open: false, product: null })

  // Stable flag key — avoids JSON.stringify producing new string refs every render
  const flagKey = Object.keys(flagFilters).filter(k => flagFilters[k]).sort().join(',')

  // Reset page on any filter change
  React.useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [debouncedSearch, statusFilter, categoryId, stockStatus, flagKey])

  // ── Data queries ─────────────────────────────────────────────────────────────

  const queryParams = {
    search: debouncedSearch,
    status_filter: statusFilter,
    custom_category_id: categoryId || undefined,
    // collection_id: collectionId || undefined,
    stock_status: stockStatus || undefined,
    is_featured: flagFilters.is_featured || undefined,
    is_trending: flagFilters.is_trending || undefined,
    is_best_seller: flagFilters.is_best_seller || undefined,
    is_new_arrival: flagFilters.is_new_arrival || undefined,
    page,
    per_page:15
  }

  

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['custom-products', queryParams],
    queryFn:  () => customProductsApi.adminList(queryParams).then(r => r.data),
    placeholderData: prev => prev,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['custom-categories', 'admin'],
    queryFn:  () => customCategoriesAPI.list().then(r => r.data),
    staleTime: 5 * 60_000,
  })

 

  // ── Mutations ────────────────────────────────────────────────────────────────

  // Prefix-only invalidation — avoids stale closure issues when queryParams change
  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ['custom-products'] }),
    [qc]
  )

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }) => customProductsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['custom-products'] })
      const snapshots = qc.getQueriesData({ queryKey: ['custom-products'] })
      qc.setQueriesData({ queryKey: ['custom-products'] }, (old) =>
        old ? { ...old, items: (old.items || []).map(p => p.id === id ? { ...p, status } : p) } : old
      )
      return { snapshots }
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error('Failed to update status')
    },
    onSettled: invalidate,
  })

  const [deletingIds, setDeletingIds] = useState(() => new Set())

  const deleteProduct = useMutation({
    mutationFn: id => customProductsApi.delete(id),
    onMutate:  id  => setDeletingIds(prev => new Set([...prev, id])),
    onSettled: (_, __, id) => setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s }),
    onSuccess: () => {
      toast.success('Product deleted successfully.')
      // Always invalidate first — mirrors the fix applied to ProductsPage.jsx.
      // Otherwise a page visited earlier than the current one can keep
      // serving the deleted product from cache within the 5-minute staleTime.
      invalidate()
      const isLastOnPage = (data?.items?.length ?? 0) === 1
      if (isLastOnPage && page > 1) setPage(p => p - 1)
    },
    onError: e => toast.error(getApiErrorMessage(e, 'Delete failed')),
  })

  const bulkMutation = useMutation({
    mutationFn: (payload) => customProductsApi.bulkAction(payload),
    onSuccess: (res) => {
      toast.success(`${res.data?.updated ?? 0} products updated successfully.`)
      setSelectedIds(new Set())
      invalidate()
    },
    onError: e => toast.error(getApiErrorMessage(e, 'Bulk action failed')),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openEdit      = useCallback(p => setFormModal({ open: true, product: p }), [])
  const openImage     = useCallback(p => setImageModal({ open: true, product: p }), [])
//   const openVariant   = useCallback(p => setVariantModal({ open: true, productId: p.id }), [])
  const openQuickEdit = useCallback(p => setQuickEditModal({ open: true, product: p }), [])
  const doToggle      = useCallback(p => toggleStatus.mutate({ id: p.id, status: p.status === 'published' ? 'draft' : 'published' }), [toggleStatus])
  const doDelete      = useCallback(p => deleteProduct.mutate(p.id), [deleteProduct])

  const toggleFlag = (key) => setFlagFilters(prev => ({ ...prev, [key]: prev[key] ? undefined : true }))

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleSelectAll = () => {
    if (selectedIds.size === data?.items?.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(data?.items?.map(p => p.id) || []))
  }

  const handleBulkAction = (action, extra) => {
    if (!selectedIds.size) return
    if (action === 'delete' && !window.confirm(`Delete ${selectedIds.size} products? This cannot be undone.`)) return
    bulkMutation.mutate({ product_ids: [...selectedIds], action, ...extra })
  }

  const hasFilters = !!(
    statusFilter ||
    categoryId ||
    Object.keys(flagFilters).some(k => flagFilters[k])
  )

  const emptyState = useMemo(() => (
    <div className="py-20 text-center">
      <Package size={36} className="mx-auto mb-3 text-muted opacity-40" />
      <p className="text-sm text-muted">No custom products found</p>
      {!hasFilters && !search && (
        <button onClick={() => setFormModal({ open: true, product: null })} className="mt-4 btn-primary text-sm">
          Create your first product
        </button>
      )}
    </div>
  ), [hasFilters, search])

  const errorState = useMemo(() => (
    <div className="py-20 text-center">
      <AlertTriangle size={36} className="mx-auto mb-3 text-amber-400 opacity-60" />
      <p className="text-sm text-muted">Failed to load products</p>
      <button onClick={invalidate} className="mt-3 btn-secondary text-sm">Retry</button>
    </div>
  ), [invalidate])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 py-2">

      {/* ── Header ── */}
      <PageHeader
        title="Custom Products"
        description={
          <span className="flex items-center gap-1.5 leading-none">
            <span className="inline-flex items-center justify-center text-[10px] font-bold rounded">
              {data?.total ?? 0}
            </span>
            total custom products
            {isFetching && !isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />}
          </span>
        }
        actions={
          // HEAD: both buttons kept — branch silently dropped "Manage Categories" which
          // is the only entry point to CategoryCollectionModal. Upgraded to <Button>.
          <div className="flex items-center gap-2">
            <Button onClick={() => setManageModal(true)} variant="secondary" icon={Settings2}>
              Manage Categories
            </Button>
            <Button onClick={() => setFormModal({ open: true, product: null })} icon={Plus}>
              Add Custom Product
            </Button>
          </div>
        }
      />

      {/* ── Filters ── */}
      {/* HEAD structure: space-y-3 wrapper + all 3 rows. Branch collapsed this to
          a single row and dropped category/collection/stock/flag filters + BulkActionsBar.
          Cherry-picked from branch: hover:bg-surface-hover on status pills. */}
      <div className="space-y-3">

        {/* Row 1: Search + Status pills */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <SearchBar
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search products, SKU, category…"
            className="max-w-md w-full"
          />
          <div className="flex gap-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['', ...STATUS_OPTIONS].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap',
                  statusFilter === s
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-app text-muted hover:text-app hover:bg-surface-hover' // branch: surface-hover
                )}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Category + Collection + Stock + Flag filters */}
        <div className="flex flex-wrap gap-2 items-center">

          {/* Category filter */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input-field py-1.5 text-xs max-w-[180px]"
          >
            <option value="">All Categories</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

        

          {/* Merchandising flag filters — stock filters removed (Custom Printing has no inventory) */}
          {FLAG_OPTIONS.map(f => (
            <FilterPill
              key={f.key}
              active={!!flagFilters[f.key]}
              label={<span className="flex items-center gap-1">{f.icon}{f.label}</span>}
              onClick={() => toggleFlag(f.key)}
              onClear={() => setFlagFilters(prev => ({ ...prev, [f.key]: undefined }))}
            />
          ))}

          {/* Clear all filters */}
          {hasFilters && (
            <button onClick={() => {
              setStatusFilter('')
              setCategoryId('')
              setFlagFilters({})
            }} className="text-xs text-muted hover:text-app underline flex items-center gap-1">
              <X size={10} /> Clear filters
            </button>
          )}
        </div>

        {/* Row 3: Bulk actions bar (only visible when rows are selected) */}
        <BulkActionsBar
            selectedIds={selectedIds}
            onAction={handleBulkAction}
            categories={categories}
            collections={[]}
            onClear={() => setSelectedIds(new Set())}
        />
      </div>

      {/* ── Mobile / Tablet: Card list ── */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="card p-4 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-12 rounded-lg bg-surface" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-surface rounded w-3/4" />
                  <div className="h-3 bg-surface rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : isError ? (
          <div className="card p-6">{errorState}</div>
        ) : data?.items?.length === 0 ? (
          <div className="card p-6">{emptyState}</div>
        ) : (
          data?.items?.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEdit}
              onToggleStatus={doToggle}
              onDelete={doDelete}
              onCategoryEdit={openQuickEdit}
              deleteLoading={deletingIds.has(product.id)}
            />
          ))
        )}
      </div>

      {/* ── Desktop: Table ── */}
      <div className="hidden lg:block card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow hover={false}>
              <TableHead className="w-8">
                <input type="checkbox"
                  checked={!!data?.items?.length && selectedIds.size === data.items.length}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 accent-brand-500" />
              </TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Original Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10">Edit</TableHead>
              <TableHead className="w-10">Category</TableHead>
              <TableHead className="w-10">Delete</TableHead>
              <TableHead className="w-24">Publish</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <TableRow key={i} hover={false}>
                  {Array(14).fill(0).map((_, j) => (
                    <TableCell key={j}>
                      <div className={clsx("h-3.5 bg-app border border-app/50 rounded animate-pulse", j === 1 ? "w-32" : "w-12")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow hover={false}><TableCell colSpan={14}>{errorState}</TableCell></TableRow>
            ) : data?.items?.length === 0 ? (
              <TableRow hover={false}><TableCell colSpan={14}>{emptyState}</TableCell></TableRow>
            ) : (
              data?.items?.map(product => {
                const stock = product.stock_quantity || 0

                const originalPrice =
                product.original_price_min

                const sellingPrice =
                product.selling_price_min
                const size = product.size || 'All Size'
                // const sizes = [...new Set((product.variants || []).map(v => v.size))].join(', ')
                const discPct =
                  product.original_price_max &&
                  product.selling_price_min
                    ? `${Math.round(
                        (
                          (product.original_price_max -
                          product.selling_price_min)
                          / product.original_price_max
                        ) * 100
                      )}%`
                    : '—'
                const statusMap = { published: 'success', draft: 'default', archived: 'warning' }
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <input type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-3.5 h-3.5 accent-brand-500" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ImageStrip thumbnail={product.thumbnail} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-app truncate max-w-[140px]">{product.title}</p>
                            {product.is_featured    && <Star size={9} className="text-amber-500 flex-shrink-0" />}
                            {product.is_trending    && <TrendingUp size={9} className="text-blue-500 flex-shrink-0" />}
                            {product.is_best_seller && <Zap size={9} className="text-purple-500 flex-shrink-0" />}
                            {product.is_new_arrival && <Layers size={9} className="text-green-500 flex-shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted font-mono truncate max-w-[140px]">
                            {product.collection_name || product.collection || product.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] text-muted">
                        {product.custom_category_name || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[10px] bg-app border border-app px-2 py-0.5 rounded text-app font-semibold">
                        {product.sku || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-app">
                      {product.original_price_max
                        ? `${formatPrice(product.original_price_min)} - ${formatPrice(product.original_price_max)}`
                        : formatPrice(product.original_price_min)}
                    </TableCell>

                    <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {product.selling_price_max
                        ? `${formatPrice(product.selling_price_min)} - ${formatPrice(product.selling_price_max)}`
                        : formatPrice(product.selling_price_min)}
                    </TableCell>
                    <TableCell className="font-medium text-amber-600">{discPct}</TableCell>
                    <TableCell>
                      <span
                        className={clsx(
                          "px-2 py-1 rounded text-xs font-semibold",
                          stock <= 0 &&
                            "bg-red-100 text-red-600",
                          stock > 0 &&
                            stock <= (product.low_stock_threshold ?? 5) &&
                            "bg-yellow-100 text-yellow-700",
                          stock > (product.low_stock_threshold ?? 5) &&
                            "bg-green-100 text-green-700"
                        )}
                      >
                        {stock}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-muted">
                      {size}
                    </TableCell>
                    <TableCell>
                      <Badge label={product.status} variant={statusMap[product.status] || 'default'} />
                    </TableCell>
                    <TableCell>
                      <button onClick={() => openEdit(product)} title="Edit" className="btn-tbl-edit">
                        <Edit size={12} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => openQuickEdit(product)} title="Edit Category & Collection"
                        className="btn-tbl-edit">
                        <Tag size={12} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <DeleteButton onConfirm={() => doDelete(product)} loading={deletingIds.has(product.id)} />
                    </TableCell>
                    <TableCell>
                      <button onClick={() => doToggle(product)}
                        className={clsx("btn-tbl-publish", product.status === 'published' ? 'is-published' : 'not-published')}>
                        {product.status === 'published' ? <><EyeOff size={10} />Unpublish</> : <><Eye size={10} />Publish</>}
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {(data?.total_pages ?? 0) > 1 && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}

      {/* ── Inline Product Form (modal) ── */}
      {formModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-app shadow-2xl">
            <div className="max-h-[90vh] overflow-y-auto">
              <ProductErrorBoundary title="Product form error">
                <CustomProductForm
                    product={formModal.product}
                    onClose={() =>
                        setFormModal({
                            open: false,
                            product: null
                        })
                    }
                    onOpenImage={openImage}
                />
              </ProductErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Manager Modal ── */}
      <ProductErrorBoundary title="Image manager error">
        <ImageUploadModal
          isOpen={imageModal.open}
          onClose={() => setImageModal({ open: false, product: null })}
          product={data?.items?.find(p => p.id === imageModal.product?.id) || imageModal.product}
          api={customProductsApi}
          queryKeyPrefix="custom-products"
          detailQueryKey="custom-product"
        />
      </ProductErrorBoundary>

      {/* ── Manage Categories & Quick Edit Modals ── */}
      <ProductErrorBoundary title="Category manager error">
        <CustomCategoryCollectionModel
          isOpen={manageModal}
          onClose={() => setManageModal(false)}
        />
      </ProductErrorBoundary>
      <ProductErrorBoundary title="Quick edit error">
        <QuickCustomCategoryEditModal
          isOpen={quickEditModal.open}
          onClose={() => setQuickEditModal({ open: false, product: null })}
          product={quickEditModal.product}
        />
      </ProductErrorBoundary>


    </div>
  )
}