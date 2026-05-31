import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Eye, EyeOff, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/common/Badge'
import Modal from '../components/common/Modal'
import Spinner from '../components/common/Spinner'

// ─── API helpers ──────────────────────────────────────────────────────────────
import { productsAPI as productsApi } from '../services/api'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['draft', 'published', 'archived']

const STATUS_BADGE = { published: 'success', draft: 'default', archived: 'warning' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function StyledInput({ ...props }) {
  return (
    <input
      className="w-full border border-app bg-app px-3 py-2.5 text-sm text-app rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
      {...props}
    />
  )
}

function StyledSelect({ children, ...props }) {
  return (
    <select
      className="w-full border border-app bg-app px-3 py-2.5 text-sm text-app rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all appearance-none"
      {...props}
    >
      {children}
    </select>
  )
}

function StyledTextarea({ ...props }) {
  return (
    <textarea
      rows={3}
      className="w-full border border-app bg-app px-3 py-2.5 text-sm text-app rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all resize-none"
      {...props}
    />
  )
}

// ─── Product Form Modal ───────────────────────────────────────────────────────

function ProductFormModal({ isOpen, onClose, product }) {
  const qc = useQueryClient()
  const isEdit = !!product

  const [form, setForm] = useState(
    product
      ? {
          title: product.title,
          description: product.description || '',
          collection: product.collection || '',
          tags: (product.tags || []).join(', '),
          status: product.status,
          is_featured: product.is_featured,
          seo_title: product.seo_title || '',
          seo_description: product.seo_description || '',
        }
      : {
          title: '', description: '', collection: '', tags: '',
          status: 'draft', is_featured: false, seo_title: '', seo_description: '',
        }
  )

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? productsApi.update(product.id, data) : productsApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created')
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Something went wrong'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Product' : 'New Product'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title *">
          <StyledInput value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="e.g. Classic Black Tee" />
        </FormField>

        <FormField label="Description">
          <StyledTextarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Product description..." />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Collection">
            <StyledInput value={form.collection} onChange={(e) => set('collection', e.target.value)} placeholder="e.g. Oversized" />
          </FormField>
          <FormField label="Tags (comma-separated)">
            <StyledInput value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="cotton, streetwear" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status">
            <StyledSelect value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="&nbsp;">
            <label className="flex items-center gap-3 cursor-pointer h-[42px]">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => set('is_featured', e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm text-app">Feature on homepage</span>
            </label>
          </FormField>
        </div>

        <div className="border-t border-app pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">SEO (optional)</p>
          <FormField label="SEO Title">
            <StyledInput value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
          </FormField>
          <FormField label="SEO Description">
            <StyledTextarea value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} className="h-16" />
          </FormField>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Spinner size="sm" />}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Variant Form Modal ───────────────────────────────────────────────────────

function VariantFormModal({ isOpen, onClose, productId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    size: 'M', color: '', color_hex: '', sku: '',
    original_price: '', selling_price: '', discount_percentage: 0,
    stock_quantity: 0, low_stock_threshold: 5,
  })

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const mutation = useMutation({
    mutationFn: (data) => productsApi.createVariant(productId, data),
    onSuccess: () => {
      toast.success('Variant added')
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'SKU may already exist'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      original_price:      parseFloat(form.original_price),
      selling_price:       parseFloat(form.selling_price),
      discount_percentage: parseFloat(form.discount_percentage),
      stock_quantity:      parseInt(form.stock_quantity),
      low_stock_threshold: parseInt(form.low_stock_threshold),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Variant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Size *">
            <StyledSelect value={form.size} onChange={(e) => set('size', e.target.value)}>
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Color">
            <StyledInput value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Black" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Color Hex">
            <StyledInput value={form.color_hex} onChange={(e) => set('color_hex', e.target.value)} placeholder="#1A1A1A" />
          </FormField>
          <FormField label="SKU *">
            <StyledInput value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="DH-BLK-M-001" required />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Original Price *">
            <StyledInput type="number" value={form.original_price} onChange={(e) => set('original_price', e.target.value)} required placeholder="999" />
          </FormField>
          <FormField label="Selling Price *">
            <StyledInput type="number" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} required placeholder="799" />
          </FormField>
          <FormField label="Discount %">
            <StyledInput type="number" value={form.discount_percentage} onChange={(e) => set('discount_percentage', e.target.value)} placeholder="0" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Stock Qty">
            <StyledInput type="number" value={form.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value)} />
          </FormField>
          <FormField label="Low Stock Alert">
            <StyledInput type="number" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} />
          </FormField>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Spinner size="sm" />}
            Add Variant
          </button>
          <button type="button" onClick={onClose} className="btn-secondary px-6">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm border border-app rounded-lg text-muted hover:text-app disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 text-sm rounded-lg border transition-colors font-medium ${
            p === page
              ? 'bg-brand-500 text-white border-brand-500 shadow-glow-sm'
              : 'border-app text-muted hover:text-app hover:border-brand-400'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm border border-app rounded-lg text-muted hover:text-app disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]               = useState(1)
  const [formModal, setFormModal]     = useState({ open: false, product: null })
  const [variantModal, setVariantModal] = useState({ open: false, productId: null })

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, statusFilter, page }],
    queryFn: () =>
      productsApi.adminList({ search, status: statusFilter, page, per_page: 15 }).then((r) => r.data),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }) => productsApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const TABLE_HEADERS = ['Product', 'Collection', 'Stock', 'Price', 'Status', 'Actions']

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-app">Products</h1>
          <p className="text-muted text-sm mt-1">
            {data?.total ?? 0} total products
          </p>
        </div>
        <button
          onClick={() => setFormModal({ open: true, product: null })}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products..."
            className="input-field pl-10 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="input-field w-auto"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-app bg-surface">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-muted uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {isLoading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface rounded-lg animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Package size={36} className="mx-auto mb-3 text-muted opacity-40" />
                    <p className="text-sm text-muted">No products found</p>
                    <button
                      onClick={() => setFormModal({ open: true, product: null })}
                      className="mt-4 btn-primary text-sm"
                    >
                      Create your first product
                    </button>
                  </td>
                </tr>
              ) : (
                data?.items?.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-surface/60 transition-colors duration-150 group"
                  >
                    {/* Product */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 rounded-lg bg-surface flex-shrink-0 overflow-hidden border border-app">
                          {product.thumbnail ? (
                            <img
                              src={product.thumbnail}
                              alt={product.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={14} className="text-muted" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-app truncate max-w-[180px]">
                            {product.title}
                          </p>
                          <p className="text-xs text-muted font-mono mt-0.5 truncate max-w-[180px]">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Collection */}
                    <td className="px-5 py-4 text-sm text-muted">
                      {product.collection || '—'}
                    </td>

                    {/* Stock */}
                    <td className="px-5 py-4">
                      <span className={`text-sm font-semibold ${
                        product.total_stock === 0
                          ? 'text-red-500'
                          : product.total_stock <= 5
                          ? 'text-amber-500'
                          : 'text-app'
                      }`}>
                        {product.total_stock}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4 text-sm font-semibold text-app">
                      {product.min_price != null ? `₹${product.min_price.toLocaleString()}` : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <Badge
                        label={product.status}
                        variant={STATUS_BADGE[product.status] || 'default'}
                        dot
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {/* Edit */}
                        <button
                          onClick={() => setFormModal({ open: true, product })}
                          title="Edit product"
                          className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-surface transition-all"
                        >
                          <Edit size={14} />
                        </button>

                        {/* Publish/Unpublish toggle */}
                        <button
                          onClick={() =>
                            toggleStatus.mutate({
                              id: product.id,
                              status: product.status === 'published' ? 'draft' : 'published',
                            })
                          }
                          title={product.status === 'published' ? 'Unpublish' : 'Publish'}
                          className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-surface transition-all"
                        >
                          {product.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>

                        {/* Add variant */}
                        <button
                          onClick={() => setVariantModal({ open: true, productId: product.id })}
                          title="Add variant"
                          className="px-2 py-1 text-xs rounded-lg border border-app text-muted hover:text-app hover:border-brand-400 transition-all"
                        >
                          + Variant
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(data?.total_pages ?? 0) > 1 && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}

      {/* Modals */}
      <ProductFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, product: null })}
        product={formModal.product}
      />
      <VariantFormModal
        isOpen={variantModal.open}
        onClose={() => setVariantModal({ open: false, productId: null })}
        productId={variantModal.productId}
      />
    </div>
  )
}