import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit, Eye, EyeOff, Package,
  Trash2, Upload, X, ImageIcon, ChevronLeft, ChevronRight,
  AlertTriangle, Layers, MoreVertical, Camera, CheckCircle, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/common/Modal'
import Spinner from '../components/common/Spinner'
import { productsAPI as productsApi } from '../services/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['draft', 'published', 'archived']
const SIZE_OPTIONS   = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const COLLECTION_OPTIONS = [
  'Oversized', 'Essentials', 'Streetwear', 'Bottoms',
  'Summer', 'Hoodies', 'Joggers', 'Limited Edition',
]

// ─── Image URL helper ─────────────────────────────────────────────────────────

function getImageUrl(thumbnail) {
  if (!thumbnail) return null
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) return thumbnail
  return thumbnail
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatPrice(value) {
  if (value == null) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ─── Shared form primitives ───────────────────────────────────────────────────

function FormField({ label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="block text-[11px] font-medium text-muted">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted italic">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-app bg-app px-2.5 py-1.5 text-sm text-app rounded-lg ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all'

function StyledInput(props)  { return <input className={inputCls} {...props} /> }
function StyledSelect({ children, ...props }) {
  return (
    <select className={`${inputCls} appearance-none`} {...props}>
      {children}
    </select>
  )
}

// ─── Product thumbnail strip ──────────────────────────────────────────────────

function ImageStrip({ thumbnail }) {
  const resolvedUrl = getImageUrl(thumbnail)
  return (
    <div className="w-8 h-9 rounded bg-surface flex-shrink-0 overflow-hidden border border-app">
      {resolvedUrl ? (
        <img src={resolvedUrl} alt="" className="w-full h-full object-cover" loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none' }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package size={11} className="text-muted" />
        </div>
      )}
    </div>
  )
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ stock }) {
  if (stock === 0) return <span className="text-sm font-semibold text-red-500 flex items-center gap-1"><AlertTriangle size={12} />Out</span>
  if (stock <= 5)  return <span className="text-sm font-semibold text-amber-500">{stock} low</span>
  return <span className="text-sm font-semibold text-app">{stock}</span>
}

// ─── Delete confirm button ────────────────────────────────────────────────────

function DeleteButton({ onConfirm, loading }) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef(null)
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
  useEffect(() => () => clearTimeout(timerRef.current), [])
  return (
    <button
      onClick={handleClick} disabled={loading}
      title={confirming ? 'Confirm delete?' : 'Delete'}
      className={`btn-tbl-delete ${confirming ? 'confirming' : ''}`}
    >
      {loading ? <Spinner size="sm" /> : <Trash2 size={12} />}
    </button>
  )
}

// ─── Mobile action menu ───────────────────────────────────────────────────────

function MobileActions({ product, onEdit, onImage, onToggleStatus, onVariant, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
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
      <button onClick={() => setOpen(o => !o)} className="p-2 rounded-lg text-muted hover:text-app hover:bg-surface transition-all">
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
}

// ─── Mobile product card ──────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onImage, onToggleStatus, onVariant, onDelete, deleteLoading }) {
  const borderMap = { published: 'border-l-green-500', draft: 'border-l-slate-400', archived: 'border-l-amber-500' }
  return (
    <div className={`card p-3 space-y-2 border-l-4 ${borderMap[product.status] || 'border-l-slate-400'}`}>
      <div className="flex items-start gap-2.5">
        <ImageStrip thumbnail={product.thumbnail} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-app truncate">{product.title}</p>
          <p className="text-[11px] text-muted font-mono truncate">{product.slug}</p>
          {product.collection && <p className="text-[11px] text-muted">{product.collection}</p>}
        </div>
        <MobileActions product={product} onEdit={onEdit} onImage={onImage}
          onToggleStatus={onToggleStatus} onVariant={onVariant} onDelete={onDelete} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`status-pill ${product.status}`}>{product.status}</span>
        <span className="text-[11px] text-muted flex items-center gap-1"><Layers size={10} />{(product.variants||[]).length}v</span>
        <span className="text-[11px]"><StockBadge stock={product.total_stock} /></span>
        <span className="text-[11px] font-semibold text-app ml-auto">{formatPrice(product.min_price)}</span>
      </div>
      {(product.variants||[]).length > 0 && (
        <p className="text-[10px] font-mono text-muted truncate border-t border-app pt-1.5">
          {product.variants[0].sku}
        </p>
      )}
      <div className="flex items-center gap-1 border-t border-app pt-1.5">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] rounded border border-app text-muted hover:border-blue-400 hover:text-blue-500 transition-all">
          <Edit size={11} /> Edit
        </button>
        <button onClick={onImage} className="relative flex-1 flex items-center justify-center gap-1 py-1 text-[11px] rounded border border-app text-muted hover:border-brand-400 transition-all">
          <ImageIcon size={11} /> Image
          {!product.thumbnail && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>
        <button onClick={onToggleStatus} className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] rounded border border-app text-muted hover:border-brand-400 transition-all">
          {product.status === 'published' ? <><EyeOff size={11} />Unp.</> : <><Eye size={11} />Pub.</>}
        </button>
        <button onClick={onVariant} className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] rounded border border-app text-muted hover:border-brand-400 transition-all">
          <Plus size={11} /> Var.
        </button>
      </div>
    </div>
  )
}

// ─── Save Progress Overlay ────────────────────────────────────────────────────
// Shows sequential step progress while batch-saving a new product

function SaveProgressOverlay({ steps }) {
  // steps: [{ label, status: 'pending' | 'loading' | 'done' | 'error' }]
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-app border border-app rounded-2xl p-6 w-80 shadow-2xl space-y-4">
        <p className="text-sm font-semibold text-app">Saving product…</p>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                {step.status === 'done'    && <CheckCircle size={18} className="text-green-500" />}
                {step.status === 'loading' && <Loader2 size={18} className="text-brand-500 animate-spin" />}
                {step.status === 'error'   && <AlertTriangle size={18} className="text-red-400" />}
                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-app" />}
              </div>
              <span className={`text-xs ${
                step.status === 'done'    ? 'text-green-500 line-through'  :
                step.status === 'loading' ? 'text-app font-semibold'       :
                step.status === 'error'   ? 'text-red-400'                 :
                'text-muted'
              }`}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Local Variant Row editor ─────────────────────────────────────────────────

function LocalVariantForm({ onAdd }) {
  const blank = { size: 'M', color: '', color_hex: '', sku: '', original_price: '', selling_price: '', discount_percentage: '', stock_quantity: 0, low_stock_threshold: 5 }
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (orig > 0 && sell > 0 && sell <= orig) {
      set('discount_percentage', (((orig - sell) / orig) * 100).toFixed(2))
    }
  }, [form.original_price, form.selling_price])

  const sellNum = parseFloat(form.selling_price || 0)
  const origNum = parseFloat(form.original_price || 0)
  const priceError = !isNaN(sellNum) && !isNaN(origNum) && sellNum > origNum && form.selling_price !== ''

  const handleAdd = () => {
    if (!form.original_price || !form.selling_price) { toast.error('Price fields required'); return }
    if (priceError) { toast.error('Selling price cannot exceed original price'); return }
    onAdd({
      size: form.size,
      color: form.color || undefined,
      color_hex: form.color_hex || undefined,
      sku: form.sku.trim() || undefined,
      original_price: parseFloat(form.original_price),
      selling_price: parseFloat(form.selling_price),
      discount_percentage: parseFloat(form.discount_percentage) || 0,
      stock_quantity: parseInt(form.stock_quantity || 0, 10),
      low_stock_threshold: parseInt(form.low_stock_threshold || 5, 10),
    })
    setForm(blank)
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inv-add-variant-btn">
        <Plus size={12} /> Add Variant
      </button>
    )
  }

  return (
    <div className="border border-app rounded-xl p-3 space-y-3 bg-surface/40">
      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">New Variant</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <FormField label="Size" required>
          <StyledSelect value={form.size} onChange={e => set('size', e.target.value)}>
            {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Color">
          <StyledInput value={form.color} onChange={e => set('color', e.target.value)} placeholder="Black" />
        </FormField>
        <FormField label="Color Hex">
          <div className="relative">
            <StyledInput value={form.color_hex} onChange={e => set('color_hex', e.target.value)} placeholder="#1A1A1A" />
            {/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color_hex) && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-app" style={{ background: form.color_hex }} />
            )}
          </div>
        </FormField>
        <FormField label="SKU" hint="auto if blank">
          <StyledInput value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="auto" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <FormField label="Original Price" required>
          <StyledInput type="number" min="0.01" step="0.01" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="999" />
        </FormField>
        <FormField label="Selling Price" required>
          <StyledInput
            type="number" min="0.01" step="0.01"
            value={form.selling_price} onChange={e => set('selling_price', e.target.value)}
            placeholder="799"
            className={`${inputCls} ${priceError ? 'border-red-400 focus:ring-red-400/30' : ''}`}
          />
        </FormField>
        <FormField label="Discount %">
          <StyledInput type="number" min="0" max="100" step="0.01" value={form.discount_percentage}
            onChange={e => set('discount_percentage', e.target.value)} placeholder="0"
            readOnly={!!(form.original_price && form.selling_price)} />
        </FormField>
        <FormField label="Stock">
          <StyledInput type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} />
        </FormField>
      </div>

      {priceError && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle size={12} /> Selling price cannot exceed original price
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleAdd} disabled={priceError} className="btn-inv-save text-xs py-1.5 px-3 disabled:opacity-50">
          Add
        </button>
        <button type="button" onClick={() => { setOpen(false); setForm(blank) }} className="btn-inv-cancel text-xs py-1.5 px-3">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Inline Product Form ──────────────────────────────────────────────────────
// NEW: For new products, images & variants are collected locally,
// then on Save: create product → upload images → create variants in sequence.
// For existing products (edit mode): works as before (immediate API calls).

function InlineProductForm({ product, onClose, onOpenVariant, onOpenImage }) {
  const qc     = useQueryClient()
  const isEdit = !!product

  const blank = { title: '', description: '', collection: '', tags: '', status: 'draft', is_featured: false, seo_title: '', seo_description: '' }
  const [form, setForm] = useState(blank)

  // Local-only state for new product flow
  const [localImages,   setLocalImages]   = useState([]) // [{ file, previewUrl }]
  const [localVariants, setLocalVariants] = useState([]) // variant objects (no id yet)
  const [saveSteps,     setSaveSteps]     = useState(null) // null = not saving; array = showing overlay

  useEffect(() => {
    setForm(product ? {
      title: product.title, description: product.description || '',
      collection: product.collection || '', tags: (product.tags || []).join(', '),
      status: product.status, is_featured: product.is_featured,
      seo_title: product.seo_title || '', seo_description: product.seo_description || '',
    } : blank)
    setLocalImages([])
    setLocalVariants([])
  }, [product?.id]) // eslint-disable-line

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const payload = () => ({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })

  // ── Edit mode mutations (unchanged behaviour) ──────────────────────────────
  const editMutation = useMutation({
    mutationFn: data => productsApi.update(product.id, data),
    onSuccess: () => { toast.success('Product updated'); qc.invalidateQueries({ queryKey: ['products'] }); onClose() },
    onError: e => toast.error(e.response?.data?.detail || 'Something went wrong'),
  })

  const editPubMutation = useMutation({
    mutationFn: data => productsApi.update(product.id, { ...data, status: 'published' }),
    onSuccess: () => { toast.success('Published!'); qc.invalidateQueries({ queryKey: ['products'] }); onClose() },
    onError: e => toast.error(e.response?.data?.detail || 'Something went wrong'),
  })

  // ── New product: sequential batch save ────────────────────────────────────
  const batchSave = async (overrideStatus) => {
    const data = payload()
    if (overrideStatus) data.status = overrideStatus

    // Build step list
    const steps = [
      { label: 'Create product', status: 'pending' },
      ...(localImages.length > 0   ? [{ label: `Upload ${localImages.length} image${localImages.length > 1 ? 's' : ''}`, status: 'pending' }] : []),
      ...(localVariants.length > 0 ? [{ label: `Create ${localVariants.length} variant${localVariants.length > 1 ? 's' : ''}`, status: 'pending' }] : []),
    ]

    const updateStep = (index, status) => {
      setSaveSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s))
    }

    setSaveSteps(steps)

    let stepIndex = 0
    let createdProduct = null

    // Step 1: Create product
    try {
      updateStep(stepIndex, 'loading')
      const res = await productsApi.create(data)
      createdProduct = res.data
      updateStep(stepIndex, 'done')
      stepIndex++
    } catch (e) {
      updateStep(stepIndex, 'error')
      toast.error(e.response?.data?.detail || 'Failed to create product')
      setSaveSteps(null)
      return
    }

    // Step 2: Upload images (if any)
    if (localImages.length > 0) {
      try {
        updateStep(stepIndex, 'loading')
        for (let i = 0; i < localImages.length; i++) {
          const fd = new FormData()
          fd.append('file', localImages[i].file)
          fd.append('set_as_primary', i === 0 ? 'true' : 'false')
          await productsApi.uploadImage(createdProduct.id, fd)
        }
        updateStep(stepIndex, 'done')
        stepIndex++
      } catch (e) {
        updateStep(stepIndex, 'error')
        toast.error('Image upload failed — product was created, you can add images later')
        stepIndex++ // continue to variants anyway
      }
    }

    // Step 3: Create variants (if any)
    if (localVariants.length > 0) {
      try {
        updateStep(stepIndex, 'loading')
        for (const v of localVariants) {
          await productsApi.createVariant(createdProduct.id, v)
        }
        updateStep(stepIndex, 'done')
      } catch (e) {
        updateStep(stepIndex, 'error')
        toast.error('Some variants failed — product was created, you can add variants later')
      }
    }

    // Small delay so user sees all green, then close
    await new Promise(r => setTimeout(r, 800))
    toast.success(overrideStatus === 'published' ? 'Product published!' : 'Product created!')
    qc.invalidateQueries({ queryKey: ['products'] })
    setSaveSteps(null)
    onClose()
  }

  // ── Local image handlers (new product only) ────────────────────────────────
  const localFileRef = useRef(null)
  const pickLocalImage = (f) => {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast.error('Only JPG, PNG, WebP allowed'); return }
    if (f.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return }
    setLocalImages(prev => [...prev, { file: f, previewUrl: URL.createObjectURL(f) }])
  }
  const removeLocalImage = (index) => {
    setLocalImages(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const addLocalVariant = (v) => setLocalVariants(prev => [...prev, v])
  const removeLocalVariant = (index) => setLocalVariants(prev => prev.filter((_, i) => i !== index))

  // ── Render ─────────────────────────────────────────────────────────────────

  const thumbnailUrl = isEdit ? getImageUrl(product?.thumbnail) : (localImages[0]?.previewUrl || null)
  const variants = isEdit ? (product?.variants || []) : localVariants
  const isBatchSaving = saveSteps !== null

  return (
    <>
      {isBatchSaving && <SaveProgressOverlay steps={saveSteps} />}

      <div className="inv-form-panel">
        <div className="inv-form-header">
          <h3>{isEdit ? `Editing: ${product.title}` : 'Add New Product'}</h3>
          <button type="button" onClick={onClose} disabled={isBatchSaving} className="text-muted hover:text-app p-1 rounded transition-colors disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => {
          e.preventDefault()
          if (isEdit) editMutation.mutate(payload())
          else batchSave()
        }}>
          <div className="inv-form-body">
            {/* LEFT: image */}
            <div className="inv-image-col">
              {isEdit ? (
                // Edit mode: existing thumbnail, click to open image modal
                <>
                  <div className="inv-image-box" onClick={() => onOpenImage(product)}
                    title="Click to manage image">
                    {thumbnailUrl
                      ? <img src={thumbnailUrl} alt={form.title} className="w-full h-full object-cover" />
                      : <div className="inv-image-placeholder">
                          <Camera size={32} className="text-muted opacity-40" />
                          <span className="text-[11px] text-muted mt-1">Add Image</span>
                        </div>}
                  </div>
                  <button type="button" onClick={() => onOpenImage(product)} className="inv-img-action-btn">
                    <Plus size={12} />{product.thumbnail ? 'Change Image' : 'Add Image'}
                  </button>
                </>
              ) : (
                // New product mode: local preview + pick button
                <>
                  <div
                    className="inv-image-box cursor-pointer"
                    onClick={() => localFileRef.current?.click()}
                    title="Click to add image"
                  >
                    {localImages.length > 0
                      ? <img src={localImages[0].previewUrl} alt="preview" className="w-full h-full object-cover" />
                      : <div className="inv-image-placeholder">
                          <Camera size={32} className="text-muted opacity-40" />
                          <span className="text-[11px] text-muted mt-1">Click to add</span>
                        </div>}
                  </div>
                  <input
                    ref={localFileRef} type="file" accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => pickLocalImage(e.target.files[0])}
                  />
                  {/* Extra image thumbnails (if multiple) */}
                  {localImages.length > 1 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {localImages.slice(1).map((img, i) => (
                        <div key={i} className="relative w-8 h-9 rounded overflow-hidden border border-app">
                          <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeLocalImage(i + 1)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => localFileRef.current?.click()} className="inv-img-action-btn">
                    <Plus size={12} />{localImages.length > 0 ? 'Add More' : 'Add Image'}
                  </button>
                  {localImages.length > 0 && (
                    <button type="button" onClick={() => removeLocalImage(0)}
                      className="text-[10px] text-red-400 hover:text-red-500 flex items-center gap-0.5 mt-0.5">
                      <X size={10} /> Remove
                    </button>
                  )}
                </>
              )}
            </div>

            {/* RIGHT: fields */}
            <div className="inv-fields-col">
              <div className="inv-form-row">
                <label>Product Name <span className="text-red-400">*</span></label>
                <div className="inv-field">
                  <input className="inv-input" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Classic Black Tee" />
                </div>
              </div>
              <div className="inv-form-row">
                <label>Code / SKU</label>
                <div className="inv-field">
                  <input className="inv-input readonly" readOnly
                    value={isEdit && variants.length > 0 ? variants[0].sku : ''}
                    placeholder={isEdit ? 'auto-generated on first variant' : 'set via variant'} />
                </div>
              </div>
              <div className="inv-form-row">
                <label>Collection </label>
                <div className="inv-field">
                  <select className="inv-input" value={form.collection} onChange={e => set('collection', e.target.value)}>
                    <option value="">— None —</option>
                    {COLLECTION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="inv-form-row">
                  <label>Status</label>
                  <div className="inv-field">
                    <select className="inv-input" value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="inv-form-row">
                  <label>Color</label>
                  <div className="inv-field">
                    <input className="inv-input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Black, White…" />
                  </div>
                </div>
              </div>
              <div className="inv-form-row">
                <label>Featured</label>
                <div className="inv-field">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="w-3.5 h-3.5 accent-brand-500" />
                    <span className="text-xs text-muted">Show on homepage</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Variants section */}
          <div className="inv-variants-section">
            <p className="inv-section-label">Variants</p>
            {variants.length > 0 ? (
              <table className="inv-variant-table">
                <thead>
                  <tr><th>Size</th><th>Actual Price</th><th>Discount Price</th><th>% off</th><th>Stock</th><th>Delete</th></tr>
                </thead>
                <tbody>
                  {variants.map((v, idx) => (
                    <tr key={isEdit ? v.id : idx}>
                      <td><span className="inv-size-chip">{v.size}</span></td>
                      <td>{formatPrice(v.original_price)}</td>
                      <td>{formatPrice(v.selling_price)}</td>
                      <td>{v.discount_percentage ? `${parseFloat(v.discount_percentage).toFixed(0)}%` : '—'}</td>
                      <td>{isEdit ? <StockBadge stock={v.stock_quantity} /> : <span className="text-xs text-app">{v.stock_quantity}</span>}</td>
                      <td>
                        {isEdit ? (
                          <button type="button" className="btn-tbl-delete" style={{ width: 22, height: 22 }}
                            onClick={() => toast('Open Edit to remove variants', { icon: 'ℹ️' })}>
                            <Trash2 size={10} />
                          </button>
                        ) : (
                          <button type="button" className="btn-tbl-delete" style={{ width: 22, height: 22 }}
                            onClick={() => removeLocalVariant(idx)}>
                            <Trash2 size={10} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted py-1.5">No variants yet.</p>
            )}

            {/* New product: inline variant builder; Edit: opens modal */}
            {isEdit ? (
              <button type="button" onClick={() => onOpenVariant(product)} className="inv-add-variant-btn">
                <Plus size={12} /> Add Variant
              </button>
            ) : (
              <LocalVariantForm onAdd={addLocalVariant} />
            )}
          </div>

          {/* Description */}
          <div className="inv-desc-section">
            <p className="inv-section-label">Description</p>
            <textarea className="inv-input" rows={3} style={{ resize: 'none', width: '100%' }}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Product description…" />
          </div>

          {/* Summary badge for new product */}
          {!isEdit && (localImages.length > 0 || localVariants.length > 0) && (
            <div className="mx-3 mb-2 flex flex-wrap gap-2">
              {localImages.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full px-2.5 py-1 font-medium">
                  <ImageIcon size={10} /> {localImages.length} image{localImages.length > 1 ? 's' : ''} ready
                </span>
              )}
              {localVariants.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-green-500/10 text-green-600 dark:text-green-400 rounded-full px-2.5 py-1 font-medium">
                  <Layers size={10} /> {localVariants.length} variant{localVariants.length > 1 ? 's' : ''} ready
                </span>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="inv-form-footer">
            <div className="inv-footer-row">
              <button type="submit" className="btn-inv-save" disabled={isBatchSaving || editMutation.isPending}>
                {(isBatchSaving || editMutation.isPending) ? <Spinner size="sm" /> : 'Save'}
              </button>
              {/* Publish button */}
              <button
                type="button"
                className="btn-inv-publish"
                disabled={isBatchSaving || editPubMutation?.isPending}
                onClick={() => {
                  if (isEdit) editPubMutation.mutate(payload())
                  else batchSave('published')
                }}
              >
                {(isBatchSaving || editPubMutation?.isPending) ? <Spinner size="sm" /> : 'Publish'}
              </button>
            </div>
            <button type="button" className="btn-inv-cancel" onClick={onClose} disabled={isBatchSaving}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Image Management Modal (for existing products) ───────────────────────────

function CurrentImagePanel({ product, onDeleted }) {
  const qc = useQueryClient()
  const thumbnailUrl = getImageUrl(product?.thumbnail)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmRef = useRef(null)

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.deleteImage(product.id),
    onSuccess: () => { toast.success('Image removed'); qc.invalidateQueries({ queryKey: ['products'] }); onDeleted() },
    onError: () => toast.error('Failed to remove image'),
  })

  useEffect(() => {
    if (confirmDelete) {
      confirmRef.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
    return () => clearTimeout(confirmRef.current)
  }, [confirmDelete])

  if (!thumbnailUrl) {
    return (
      <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-app bg-surface/40">
        <div className="text-center">
          <Package size={18} className="mx-auto mb-1 text-muted opacity-50" />
          <p className="text-xs text-muted">No image yet</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Current Image</p>
      <div className="relative group w-full rounded-xl overflow-hidden border border-app bg-surface/40" style={{ maxHeight: 200 }}>
        <img src={thumbnailUrl} alt={product?.title || ''} className="w-full object-contain" style={{ maxHeight: 200 }}
          onError={e => { e.currentTarget.parentElement.innerHTML = '<div class="flex items-center justify-center h-20 text-xs text-muted p-4">Image not found</div>' }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} disabled={deleteMutation.isPending}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Trash2 size={12} /> Remove
            </button>
          ) : (
            <button onClick={() => { setConfirmDelete(false); deleteMutation.mutate() }} disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              {deleteMutation.isPending ? <Spinner size="sm" /> : <AlertTriangle size={12} />}
              {deleteMutation.isPending ? 'Removing…' : 'Confirm remove'}
            </button>
          )}
        </div>
        <span className="absolute top-2 left-2 bg-brand-500 text-white text-[9px] rounded px-1.5 py-0.5 font-semibold">THUMBNAIL</span>
      </div>
    </div>
  )
}

function ImageUploadModal({ isOpen, onClose, product }) {
  const qc      = useQueryClient()
  const fileRef = useRef(null)
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => { if (!isOpen) { setFile(null); setPreview(null) } }, [isOpen])

  const handleImageDeleted = useCallback(() => { setFile(null); setPreview(null) }, [])

  const pickFile = f => {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast.error('Only JPG, PNG, WebP allowed'); return }
    if (f.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('set_as_primary', 'true')
      return productsApi.uploadImage(product.id, fd)
    },
    onSuccess: () => { toast.success('Image uploaded'); qc.invalidateQueries({ queryKey: ['products'] }); setFile(null); setPreview(null); onClose() },
    onError: e => toast.error(e.response?.data?.detail || 'Upload failed'),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Image" size="lg">
      <div className="space-y-5">
        <CurrentImagePanel product={product} onDeleted={handleImageDeleted} />
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {product?.thumbnail ? 'Replace Image' : 'Upload Image'}
          </p>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragging ? 'border-brand-500 bg-brand-500/5' : 'border-app hover:border-brand-400 hover:bg-surface/50'
            }`}
          >
            {preview ? (
              <img src={preview} alt="preview" className="mx-auto max-h-32 rounded-lg object-contain" />
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2 text-muted" />
                <p className="text-sm text-muted">Drop image here or <span className="text-brand-500">browse</span></p>
                <p className="text-xs text-muted mt-1">JPG, PNG, WebP · max 10 MB</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickFile(e.target.files[0])} />
          </div>
        </div>
        {file && (
          <button onClick={() => { setFile(null); setPreview(null) }} className="text-xs text-muted hover:text-app flex items-center gap-1">
            <X size={11} /> Clear selection
          </button>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onClose} className="btn-secondary sm:px-6">Done</button>
          <button onClick={() => uploadMutation.mutate()} disabled={!file || uploadMutation.isPending}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
            {uploadMutation.isPending ? <Spinner size="sm" /> : <Upload size={14} />}
            {product?.thumbnail ? 'Replace Image' : 'Upload Image'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Variant Form Modal (for existing products only) ──────────────────────────

function VariantFormModal({ isOpen, onClose, productId }) {
  const qc = useQueryClient()
  const blank = { size: 'M', color: '', color_hex: '', sku: '', original_price: '', selling_price: '', discount_percentage: '', stock_quantity: 0, low_stock_threshold: 5 }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { if (isOpen) setForm(blank) }, [isOpen]) // eslint-disable-line

  useEffect(() => {
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (orig > 0 && sell > 0 && sell <= orig) {
      set('discount_percentage', (((orig - sell) / orig) * 100).toFixed(2))
    }
  }, [form.original_price, form.selling_price])

  const mutation = useMutation({
    mutationFn: data => productsApi.createVariant(productId, data),
    onSuccess: () => { toast.success('Variant added'); qc.invalidateQueries({ queryKey: ['products'] }); onClose() },
    onError: e => toast.error(e.response?.data?.detail || 'SKU may already exist'),
  })

  const handleSubmit = e => {
    e.preventDefault()
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (sell > orig) { toast.error('Selling price cannot exceed original price'); return }
    mutation.mutate({
      size: form.size,
      color: form.color || undefined,
      color_hex: form.color_hex || undefined,
      ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
      original_price: orig,
      selling_price: sell,
      discount_percentage: parseFloat(form.discount_percentage) || 0,
      stock_quantity: parseInt(form.stock_quantity || 0, 10),
      low_stock_threshold: parseInt(form.low_stock_threshold || 5, 10),
    })
  }

  const sellNum = parseFloat(form.selling_price || 0)
  const origNum = parseFloat(form.original_price || 0)
  const priceError = !isNaN(sellNum) && !isNaN(origNum) && sellNum > origNum

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Variant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Size" required>
            <StyledSelect value={form.size} onChange={e => set('size', e.target.value)}>
              {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </StyledSelect>
          </FormField>
          <FormField label="Color">
            <StyledInput value={form.color} onChange={e => set('color', e.target.value)} placeholder="Black" />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Color Hex">
            <div className="relative">
              <StyledInput value={form.color_hex} onChange={e => set('color_hex', e.target.value)} placeholder="#1A1A1A" />
              {/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color_hex) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-app" style={{ background: form.color_hex }} />
              )}
            </div>
          </FormField>
          <FormField label="SKU" hint="leave blank to auto-generate">
            <StyledInput value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="auto: CBT-BLK-M-001" />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Original Price" required>
            <StyledInput type="number" min="0.01" step="0.01" value={form.original_price} onChange={e => set('original_price', e.target.value)} required placeholder="999" />
          </FormField>
          <FormField label="Selling Price" required>
            <StyledInput type="number" min="0.01" step="0.01" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} required placeholder="799"
              className={`${inputCls} ${priceError ? 'border-red-400 focus:ring-red-400/30' : ''}`} />
          </FormField>
          <FormField label="Discount %">
            <StyledInput type="number" min="0" max="100" step="0.01" value={form.discount_percentage} onChange={e => set('discount_percentage', e.target.value)} placeholder="0" readOnly={!!(form.original_price && form.selling_price)} />
          </FormField>
        </div>
        {priceError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 -mt-2">
            <AlertTriangle size={12} /> Selling price cannot exceed original price
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Stock Qty">
            <StyledInput type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} />
          </FormField>
          <FormField label="Low Stock Alert">
            <StyledInput type="number" min="0" value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)} />
          </FormField>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary sm:px-6">Cancel</button>
          <button type="submit" disabled={mutation.isPending || priceError} className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
            {mutation.isPending && <Spinner size="sm" />}
            Add Variant
          </button>
        </div>
      </form>
    </Modal>
  )
}

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
            className={`w-8 h-8 sm:w-9 sm:h-9 text-sm rounded-lg border transition-colors font-medium ${
              p === page ? 'bg-brand-500 text-white border-brand-500' : 'border-app text-muted hover:text-app hover:border-brand-400'
            }`}>
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

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page,         setPage]         = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const [formModal,    setFormModal]    = useState({ open: false, product: null })
  const [variantModal, setVariantModal] = useState({ open: false, productId: null })
  const [imageModal,   setImageModal]   = useState({ open: false, product: null })

  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['products', { search: debouncedSearch, statusFilter, page }],
    queryFn:  () =>
      productsApi.adminList({ search: debouncedSearch, status_filter: statusFilter, page, per_page: 15 })
        .then(r => r.data),
    placeholderData: prev => prev,
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }) => productsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['products'] })
      const prev = qc.getQueryData(['products', { search: debouncedSearch, statusFilter, page }])
      qc.setQueryData(['products', { search: debouncedSearch, statusFilter, page }], old =>
        old ? { ...old, items: old.items.map(p => p.id === id ? { ...p, status } : p) } : old
      )
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['products', { search: debouncedSearch, statusFilter, page }], ctx.prev)
      toast.error('Failed to update status')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const deleteProduct = useMutation({
    mutationFn: id => productsApi.delete(id),
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError:   e  => toast.error(e.response?.data?.detail || 'Delete failed'),
  })

  const openEdit    = p => { setFormModal({ open: true, product: p }); setTimeout(() => document.getElementById('inv-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const openImage   = p => setImageModal({ open: true, product: p })
  const openVariant = p => setVariantModal({ open: true, productId: p.id })
  const doToggle    = p => toggleStatus.mutate({ id: p.id, status: p.status === 'published' ? 'draft' : 'published' })
  const doDelete    = p => deleteProduct.mutate(p.id)

  const emptyState = (
    <div className="py-20 text-center">
      <Package size={36} className="mx-auto mb-3 text-muted opacity-40" />
      <p className="text-sm text-muted">No products found</p>
      {!search && !statusFilter && (
        <button onClick={() => setFormModal({ open: true, product: null })} className="mt-4 btn-primary text-sm">
          Create your first product
        </button>
      )}
    </div>
  )

  const errorState = (
    <div className="py-20 text-center">
      <AlertTriangle size={36} className="mx-auto mb-3 text-amber-400 opacity-60" />
      <p className="text-sm text-muted">Failed to load products</p>
      <button onClick={() => qc.invalidateQueries({ queryKey: ['products'] })} className="mt-3 btn-secondary text-sm">
        Retry
      </button>
    </div>
  )

  return (
    <div className="space-y-4 py-3 sm:py-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 bg-surface border border-app rounded-xl px-4 py-3">
        <div>
          <h1 className="font-display font-bold text-lg sm:text-xl text-app leading-tight">Products</h1>
          <p className="text-muted text-xs mt-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center bg-brand-500 text-white text-[10px] font-bold rounded px-1.5 py-0.5">{data?.total ?? 0}</span>
            total items
            {isFetching && !isLoading && <Spinner size="sm" />}
          </p>
        </div>
        <button
          onClick={() => setFormModal({ open: true, product: null })}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={13} /> Add Product
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products, SKUs, collections…"
            className="w-full border border-app bg-app rounded-lg pl-8 pr-8 py-1.5 text-xs text-app placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={11} /></button>
          )}
        </div>
        <div className="flex gap-1">
          {['', ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                statusFilter === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-app text-muted hover:text-app hover:border-brand-400'
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
          <div className="card">{errorState}</div>
        ) : data?.items?.length === 0 ? (
          <div className="card">{emptyState}</div>
        ) : (
          data?.items?.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEdit(product)}
              onImage={() => openImage(product)}
              onToggleStatus={() => doToggle(product)}
              onVariant={() => openVariant(product)}
              onDelete={() => doDelete(product)}
              deleteLoading={deleteProduct.isPending && deleteProduct.variables === product.id}
            />
          ))
        )}
      </div>

      {/* ── Desktop: Inventory table ── */}
      <div className="hidden lg:block bg-app border border-app rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Products</th>
                <th>Code</th>
                <th>Original Price</th>
                <th>Discount Price</th>
                <th>Discount</th>
                <th>Stock</th>
                <th>Size</th>
                <th>Status</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Publish</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(11).fill(0).map((_, j) => (
                      <td key={j}><div className={`h-3 bg-surface rounded animate-pulse ${j === 0 ? 'w-32' : 'w-12'}`} /></td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr><td colSpan={11}>{errorState}</td></tr>
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={11}>{emptyState}</td></tr>
              ) : (
                data?.items?.map(product => {
                  const v0 = (product.variants || [])[0]
                  const sizes = [...new Set((product.variants || []).map(v => v.size))].join(', ')
                  const discPct = v0?.discount_percentage ? `${parseFloat(v0.discount_percentage).toFixed(0)}%` : '—'
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <ImageStrip thumbnail={product.thumbnail} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-app truncate max-w-[140px]">{product.title}</p>
                            <p className="text-[10px] text-muted font-mono truncate max-w-[140px]">{product.collection || product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="sku-chip">{v0?.sku || '—'}</span></td>
                      <td className="text-xs font-medium text-app">{formatPrice(v0?.original_price ?? product.min_price)}</td>
                      <td className="text-xs font-medium text-green-600 dark:text-green-400">{formatPrice(v0?.selling_price)}</td>
                      <td className="text-xs font-medium text-amber-600">{discPct}</td>
                      <td><StockBadge stock={product.total_stock} /></td>
                      <td className="text-xs text-muted">{sizes || '—'}</td>
                      <td><span className={`status-pill ${product.status}`}>{product.status}</span></td>
                      <td>
                        <button onClick={() => openEdit(product)} title="Edit" className="btn-tbl-edit">
                          <Edit size={12} />
                        </button>
                      </td>
                      <td>
                        <DeleteButton onConfirm={() => doDelete(product)}
                          loading={deleteProduct.isPending && deleteProduct.variables === product.id} />
                      </td>
                      <td>
                        <button onClick={() => doToggle(product)}
                          className={`btn-tbl-publish ${product.status === 'published' ? 'is-published' : 'not-published'}`}>
                          {product.status === 'published' ? <><EyeOff size={10} />Unpub.</> : <><Eye size={10} />Publish</>}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {(data?.total_pages ?? 0) > 1 && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}

      {/* ── Inline Product Form ── */}
      {formModal.open && (
        <div id="inv-form-anchor">
          <InlineProductForm
            product={formModal.product}
            onClose={() => setFormModal({ open: false, product: null })}
            onOpenVariant={p => setVariantModal({ open: true, productId: p.id })}
            onOpenImage={p => setImageModal({ open: true, product: p })}
          />
        </div>
      )}

      {/* ── Modals ── */}
      <VariantFormModal
        isOpen={variantModal.open}
        onClose={() => setVariantModal({ open: false, productId: null })}
        productId={variantModal.productId}
      />
      <ImageUploadModal
        isOpen={imageModal.open}
        onClose={() => setImageModal({ open: false, product: null })}
        product={imageModal.product}
      />
    </div>
  )
}