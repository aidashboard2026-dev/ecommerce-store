/**
 * ProductsPage.jsx — table, filters, pagination, state orchestration.
 *
 * Component split:
 *   components/products/InlineProductForm.jsx  — form + batch save
 *   components/products/ImageUploadModal.jsx   — image management modal
 *   components/products/VariantFormModal.jsx   — variant add modal
 *   utils/productUtils.js                      — formatPrice, getImageUrl,
 *                                                revokeObjectURLs, genLocalId,
 *                                                isDuplicateFile, useDebounce
 *
 * Bug fixes in this file:
 *   WARN: AppRoutes now imports SignupPage from the correct path now that split is done.
 */
import React, { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit, Eye, EyeOff, Package,
  Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, Layers, MoreVertical, ImageIcon, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { productsAPI as productsApi } from '../../services/api'
import { formatPrice, getImageUrl, useDebounce } from '../../utils/productUtils'
import InlineProductForm from '../../components/products/InlineProductForm'
import ImageUploadModal from '../../components/products/ImageUploadModal'
import VariantFormModal from '../../components/products/VariantFormModal'
import Modal from '../../components/common/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['draft', 'published', 'archived']

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ProductErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[ProductErrorBoundary]', error, info?.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-4 text-center">
          <AlertTriangle size={20} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm font-semibold text-red-400">
            {this.props.title || 'Something went wrong'}
          </p>
          <p className="text-xs text-muted mt-1">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs underline text-muted hover:text-app"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Image URL / thumbnail strip ──────────────────────────────────────────────

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

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ stock }) {
  if (stock === 0) return <Badge label="Out" variant="danger" dot />
  if (stock <= 5) return <Badge label={`${stock} Low`} variant="warning" dot />
  return <Badge label={`${stock} stock`} variant="success" />
}

// ─── Delete confirm button ────────────────────────────────────────────────────

function DeleteButton({ onConfirm, loading }) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = React.useRef(null)
  const handleClick = () => {
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => setConfirming(false), 3000)
    } else {
      clearTimeout(timerRef.current)
      setConfirming(false)
      onConfirm()
    }
  }
  React.useEffect(() => () => clearTimeout(timerRef.current), [])
  return (
    <button
      onClick={handleClick} disabled={loading}
      title={confirming ? 'Confirm delete?' : 'Delete'}
      className={`btn-tbl-delete ${confirming ? 'confirming' : ''}`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
    </button>
  )
}

// ─── Mobile action menu ───────────────────────────────────────────────────────

const MobileActions = React.memo(function MobileActions({ product, onEdit, onImage, onToggleStatus, onVariant, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const item = (label, icon, action, danger = false) => (
    <button
      onClick={() => { setOpen(false); action() }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-app hover:bg-surface'}`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Product actions menu" className="p-2 rounded-lg text-muted hover:text-app hover:bg-surface transition-all">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-app bg-app shadow-xl z-50 overflow-hidden">
          {item('Edit', <Edit size={14} />, onEdit)}
          {item('Manage Image', <ImageIcon size={14} />, onImage)}
          {item(
            product.status === 'published' ? 'Unpublish' : 'Publish',
            product.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />,
            onToggleStatus,
          )}
          {item('Add Variant', <Layers size={14} />, onVariant)}
          <div className="border-t border-app my-1" />
          {item('Delete', <Trash2 size={14} />, onDelete, true)}
        </div>
      )}
    </div>
  )
})

// ─── Mobile product card ──────────────────────────────────────────────────────

const ProductCard = React.memo(function ProductCard({ product, onEdit, onImage, onToggleStatus, onVariant, onDelete, deleteLoading }) {
  const borderMap = { published: 'border-l-green-500', draft: 'border-l-slate-400', archived: 'border-l-amber-500' }
  return (
    <div className={`card p-3 space-y-2 border-l-4 ${borderMap[product.status] || 'border-l-slate-400'}`}>
      <div className="flex items-start gap-2.5">
        <ImageStrip thumbnail={product.thumbnail} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-app truncate">{product.title}</p>
          <p className="text-[10px] text-muted font-mono truncate">{product.collection || product.slug}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`status-pill ${product.status}`}>{product.status}</span>
            <StockBadge stock={product.total_stock} />
          </div>
        </div>
        <MobileActions
          product={product}
          onEdit={() => onEdit(product)}
          onImage={() => onImage(product)}
          onToggleStatus={() => onToggleStatus(product)}
          onVariant={() => onVariant(product)}
          onDelete={() => onDelete(product)}
        />
      </div>
      <div className="flex gap-1.5">
        <span className="text-[11px] text-muted">from</span>
        <span className="text-[11px] font-semibold text-app ml-auto">{formatPrice(product.min_price)}</span>
      </div>
    </div>
  )
})

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) pages.push(p)
  }
  const withGaps = []
  let prev = 0
  for (const p of pages) {
    if (p - prev > 1) withGaps.push('…')
    withGaps.push(p)
    prev = p
  }
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="px-2.5 sm:px-3 py-1.5 text-sm border border-app rounded-lg text-muted hover:text-app disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <ChevronLeft size={14} />
      </button>
      {withGaps.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="w-8 sm:w-9 text-center text-muted text-sm">…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-8 h-8 sm:w-9 sm:h-9 text-sm rounded-lg border transition-colors font-medium ${p === page ? 'bg-brand-500 text-white border-brand-500' : 'border-app text-muted hover:text-app hover:border-brand-400'}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
        className="px-2.5 sm:px-3 py-1.5 text-sm border border-app rounded-lg text-muted hover:text-app disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const [formModal, setFormModal] = useState({ open: false, product: null })
  const [variantModal, setVariantModal] = useState({ open: false, productId: null })
  const [imageModal, setImageModal] = useState({ open: false, product: null })

  React.useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['products', { search: debouncedSearch, statusFilter, page }],
    queryFn: () =>
      productsApi.adminList({ search: debouncedSearch, status_filter: statusFilter, page, per_page: 15 })
        .then(r => r.data),
    placeholderData: prev => prev,
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }) => productsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      const queryKey = ['products', { search: debouncedSearch, statusFilter, page }]
      await qc.cancelQueries({ queryKey, exact: true })
      const prev = qc.getQueryData(queryKey)
      qc.setQueryData(queryKey, old =>
        old ? { ...old, items: old.items.map(p => p.id === id ? { ...p, status } : p) } : old
      )
      return { prev, queryKey }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.queryKey, ctx.prev)
      toast.error('Failed to update status')
    },
    onSettled: (_data, _err, _vars, ctx) => {
      qc.invalidateQueries({
        queryKey: ctx?.queryKey ?? ['products', { search: debouncedSearch, statusFilter, page }],
        exact: !!ctx?.queryKey,
      })
    },
  })

  const [deletingIds, setDeletingIds] = useState(() => new Set())

  const deleteProduct = useMutation({
    mutationFn: id => productsApi.delete(id),
    onMutate: id => setDeletingIds(prev => new Set([...prev, id])),
    onSettled: (_, __, id) => setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s }),
    onSuccess: () => {
      toast.success('Product deleted')
      const isLastOnPage = (data?.items?.length ?? 0) === 1
      if (isLastOnPage && page > 1) {
        setPage(p => p - 1)
      } else {
        qc.invalidateQueries({ queryKey: ['products', { search: debouncedSearch, statusFilter, page }] })
      }
    },
    onError: e => toast.error(e.response?.data?.detail || 'Delete failed'),
  })

  const openEdit    = useCallback(p => {
    setFormModal({ open: true, product: p })
  }, [])
  const openImage   = useCallback(p => setImageModal({ open: true, product: p }), [])
  const openVariant = useCallback(p => setVariantModal({ open: true, productId: p.id }), [])
  const doToggle    = useCallback(p => toggleStatus.mutate({ id: p.id, status: p.status === 'published' ? 'draft' : 'published' }), [toggleStatus])
  const doDelete    = useCallback(p => deleteProduct.mutate(p.id), [deleteProduct])

  const emptyState = useMemo(() => (
    <div className="py-20 text-center">
      <Package size={36} className="mx-auto mb-3 text-muted opacity-40" />
      <p className="text-sm text-muted">No products found</p>
      {!search && !statusFilter && (
        <button onClick={() => setFormModal({ open: true, product: null })} className="mt-4 btn-primary text-sm">
          Create your first product
        </button>
      )}
    </div>
  ), [search, statusFilter])

  const errorState = useMemo(() => (
    <div className="py-20 text-center">
      <AlertTriangle size={36} className="mx-auto mb-3 text-amber-400 opacity-60" />
      <p className="text-sm text-muted">Failed to load products</p>
      <button onClick={() => qc.invalidateQueries({ queryKey: ['products'] })} className="mt-3 btn-secondary text-sm">
        Retry
      </button>
    </div>
  ), [qc])

  return (
    <div className="space-y-6 py-2">

      {/* ── Header ── */}
      <PageHeader
        title="Products"
        description={
          <span className="flex items-center gap-1.5 leading-none">
            <span className="inline-flex items-center justify-centertext-[10px] font-bold rounded ">
              {data?.total ?? 0}
            </span>
            total items
            {isFetching && !isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />}
          </span>
        }
        actions={
          <Button
            onClick={() => setFormModal({ open: true, product: null })}
            icon={Plus} 
          >
            Add Product
          </Button>
        }
      />

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <SearchBar
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search products, SKUs, collections…"
          className="max-w-md w-full"
        />
        <div className="flex gap-1 items-center sm:flex-nowrap sm:self-auto flex-wrap w-full sm:w-auto pb-1 sm:pb-0">
          {['', ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${statusFilter === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-app text-muted hover:text-app hover:bg-surface-hover'
                }`}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
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
              <div className="flex gap-2">
                {Array(4).fill(0).map((_, j) => <div key={j} className="flex-1 h-8 bg-surface rounded-lg" />)}
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
              onImage={openImage}
              onToggleStatus={doToggle}
              onVariant={openVariant}
              onDelete={doDelete}
              deleteLoading={deletingIds.has(product.id)}
            />
          ))
        )}
      </div>

      {/* ── Desktop: Inventory table ── */}
      <div className="hidden lg:block card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow hover={false}>
              <TableHead>Products</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Original Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10">Edit</TableHead>
              <TableHead className="w-10">Delete</TableHead>
              <TableHead className="w-24">Publish</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <TableRow key={i} hover={false}>
                  {Array(11).fill(0).map((_, j) => (
                    <TableCell key={j}>
                      <div className={clsx("h-3.5 bg-app border border-app/50 rounded animate-pulse", j === 0 ? "w-32" : "w-12")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow hover={false}>
                <TableCell colSpan={11}>{errorState}</TableCell>
              </TableRow>
            ) : data?.items?.length === 0 ? (
              <TableRow hover={false}>
                <TableCell colSpan={11}>{emptyState}</TableCell>
              </TableRow>
            ) : (
              data?.items?.map(product => {
                const v0 = (product.variants || [])[0]
                const sizes = [...new Set((product.variants || []).map(v => v.size))].join(', ')
                const discPct = v0?.discount_percentage ? `${parseFloat(v0.discount_percentage).toFixed(0)}%` : '—'
                const statusMap = { published: 'success', draft: 'default', archived: 'warning' }
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ImageStrip thumbnail={product.thumbnail} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-app truncate max-w-[160px]">{product.title}</p>
                          <p className="text-[10px] text-muted font-mono truncate max-w-[160px]">{product.collection || product.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[10px] bg-app border border-app px-2 py-0.5 rounded text-app font-semibold">
                        {v0?.sku || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-app">{formatPrice(v0?.original_price ?? product.min_price)}</TableCell>
                    <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(v0?.selling_price)}</TableCell>
                    <TableCell className="font-medium text-amber-600">{discPct}</TableCell>
                    <TableCell><StockBadge stock={product.total_stock} /></TableCell>
                    <TableCell className="text-muted">{sizes || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        label={product.status}
                        variant={statusMap[product.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <button onClick={() => openEdit(product)} title="Edit" className="btn-tbl-edit">
                        <Edit size={12} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <DeleteButton onConfirm={() => doDelete(product)}
                        loading={deletingIds.has(product.id)} />
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

      {/* ── Inline Product Form (now modal) ── */}
     {formModal.open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-app shadow-2xl">
      <div className="max-h-[90vh] overflow-y-auto">
        <ProductErrorBoundary title="Product form error">
          <InlineProductForm
            product={formModal.product}
            onClose={() => setFormModal({ open: false, product: null })}
            onOpenVariant={p =>
              setVariantModal({ open: true, productId: p.id })
            }
            onOpenImage={p =>
              setImageModal({ open: true, product: p })
            }
          />
        </ProductErrorBoundary>
      </div>
    </div>
  </div>
)}

      {/* ── Modals ── */}
      <ProductErrorBoundary title="Variant form error">
        <VariantFormModal
          isOpen={variantModal.open}
          onClose={() => setVariantModal({ open: false, productId: null })}
          productId={variantModal.productId}
        />
      </ProductErrorBoundary>
      <ProductErrorBoundary title="Image manager error">
        <ImageUploadModal
          isOpen={imageModal.open}
          onClose={() => setImageModal({ open: false, product: null })}
          product={imageModal.product}
        />
      </ProductErrorBoundary>
    </div>
  )
}
