/**
 * InlineProductForm.jsx
 *
 * CRITICAL FIX: In edit mode the variant delete button was showing a toast
 * ("Open Edit to remove variants") instead of actually deleting the variant.
 * Now wired to productsAPI.deleteVariant via useMutation, with query invalidation.
 *
 * WARN FIX: isCriticalFailureRef is now reset at the top of batchSave so
 * a retry after a step-1 failure starts with a clean slate.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, Camera, Layers, ImageIcon, Trash2, Eye, EyeOff,
  AlertTriangle, CheckCircle, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Spinner from '../common/Spinner'
import { productsAPI as productsApi } from '../../services/api'
import {
  formatPrice, getImageUrl, revokeObjectURLs, genLocalId, isDuplicateFile,
} from '../../utils/productUtils'

// ─── Constants (shared with page) ────────────────────────────────────────────
const STATUS_OPTIONS = ['draft', 'published', 'archived']
const MAX_IMAGES = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const COLLECTION_OPTIONS = [
  'Oversized', 'Essentials', 'Streetwear', 'Bottoms',
  'Summer', 'Hoodies', 'Joggers', 'Limited Edition',
]

// ─── Module-level blank form state (stable reference, no hook needed) ─────────
const BLANK_VARIANT_FORM = {
  size: 'M', color: '', color_hex: '', sku: '',
  original_price: '', selling_price: '', discount_percentage: '',
  stock_quantity: 0, low_stock_threshold: 5,
}

// ─── Shared form primitives ───────────────────────────────────────────────────

function FormField({ label, required, hint, htmlFor, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="block text-[11px] font-medium text-muted">
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

function StyledInput(props) { return <input className={inputCls} {...props} /> }
function StyledSelect({ children, ...props }) {
  return (
    <select className={`${inputCls} appearance-none`} {...props}>
      {children}
    </select>
  )
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ stock }) {
  if (stock === 0) return <span className="text-sm font-semibold text-red-500 flex items-center gap-1"><AlertTriangle size={12} />Out</span>
  if (stock <= 5) return <span className="text-sm font-semibold text-amber-500">{stock} low</span>
  return <span className="text-sm font-semibold text-app">{stock}</span>
}

// ─── Save Progress Overlay ────────────────────────────────────────────────────

function SaveProgressOverlay({ steps, onClose }) {
  const hasError = steps.some(s => s.status === 'error')
  const allDone = steps.every(s => s.status === 'done' || s.status === 'error')
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Save progress">
      <div className="bg-app border border-app rounded-2xl p-6 w-80 shadow-2xl space-y-4">
        <p className="text-sm font-semibold text-app">
          {hasError && allDone ? 'Completed with issues' : 'Saving product…'}
        </p>
        <div className="space-y-3">
          {steps.map(step => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center mt-0.5">
                {step.status === 'done' && <CheckCircle size={18} className="text-green-500" />}
                {step.status === 'loading' && <Loader2 size={18} className="text-brand-500 animate-spin" />}
                {step.status === 'error' && <AlertTriangle size={18} className="text-red-400" />}
                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-app" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-xs ${step.status === 'done' ? 'text-green-500 line-through' :
                    step.status === 'loading' ? 'text-app font-semibold' :
                      step.status === 'error' ? 'text-red-400' :
                        'text-muted'
                  }`}>{step.label}</span>
                {step.details && (
                  <p className={`text-[10px] mt-0.5 ${step.status === 'error' ? 'text-red-400/80' : 'text-muted'}`}>{step.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {hasError && allDone && onClose && (
          <button onClick={onClose} className="w-full text-xs font-medium py-2 rounded-lg border border-app text-app hover:bg-surface transition-colors">
            Close
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Local Variant Row editor (new product only) ──────────────────────────────

function LocalVariantForm({ onAdd, existingVariants = [] }) {
  const [form, setForm] = useState(BLANK_VARIANT_FORM)
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
    const stockQty = parseInt(form.stock_quantity || 0, 10)
    if (stockQty < 0) { toast.error('Stock cannot be negative'); return }
    const dupExists = existingVariants.some(v =>
      v.size === form.size && (v.color || '') === (form.color || '')
    )
    if (dupExists) { toast.error(`Variant with size "${form.size}" and color "${form.color || 'none'}" already exists`); return }
    onAdd({
      _localId: genLocalId(),
      size: form.size,
      color: form.color || undefined,
      color_hex: form.color_hex || undefined,
      sku: form.sku.trim() || undefined,
      original_price: parseFloat(form.original_price),
      selling_price: parseFloat(form.selling_price),
      discount_percentage: parseFloat(form.discount_percentage) || 0,
      stock_quantity: stockQty,
      low_stock_threshold: parseInt(form.low_stock_threshold || 5, 10),
    })
    setForm(BLANK_VARIANT_FORM)
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

      <div className="flex items-center gap-2 w-full">
        <button type="button" onClick={handleAdd} disabled={priceError}
          className="btn-inv-save text-xs py-2 px-4 min-w-[100px] whitespace-nowrap disabled:opacity-50">
          Add Variant
        </button>
        <button type="button" onClick={() => { setOpen(false); setForm(BLANK_VARIANT_FORM) }}
          className="btn-inv-cancel flex-1 text-xs py-2 px-4 whitespace-nowrap">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InlineProductForm({ product, onClose, onOpenVariant, onOpenImage }) {
  const qc = useQueryClient()
  const isEdit = !!product

  const blankForm = useRef({ title: '', description: '', collection: '', tags: '', status: 'draft', is_featured: false, seo_title: '', seo_description: '' })
  const [form, setForm] = useState(blankForm.current)

  const [localImages, setLocalImages] = useState([])
  const [localVariants, setLocalVariants] = useState([])
  const [saveSteps, setSaveSteps] = useState(null)
  const isSavingRef = useRef(false)
  const isCriticalFailureRef = useRef(false)

  const localImagesRef = useRef(localImages)
  useEffect(() => { localImagesRef.current = localImages }, [localImages])
  const productRef = useRef(product)
  useEffect(() => { productRef.current = product }, [product])

  useEffect(() => {
    return () => { revokeObjectURLs(localImagesRef.current) }
  }, [])

  useEffect(() => {
    revokeObjectURLs(localImagesRef.current)
    const p = productRef.current
    setForm(p ? {
      title: p.title, description: p.description || '',
      collection: p.collection || '', tags: (p.tags || []).join(', '),
      status: p.status, is_featured: p.is_featured,
      seo_title: p.seo_title || '', seo_description: p.seo_description || '',
    } : blankForm.current)
    setLocalImages([])
    setLocalVariants([])
  }, [product?.id])

  const hasUnsavedChanges = useMemo(() => {
    if (isEdit) return false
    return localImages.length > 0 || localVariants.length > 0 ||
      form.title.trim() !== '' || form.description.trim() !== ''
  }, [isEdit, localImages.length, localVariants.length, form.title, form.description])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handler = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Discard?')) return
    revokeObjectURLs(localImages)
    onClose()
  }, [hasUnsavedChanges, localImages, onClose])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const payload = () => ({ ...form, title: form.title.trim(), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })

  // ── Edit mode mutations ──────────────────────────────────────────────────────
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

  // ── CRITICAL 1: Real variant delete mutation ─────────────────────────────────
  // Track deleting variant IDs so we can show per-row loading state
  const [deletingVariantIds, setDeletingVariantIds] = useState(() => new Set())

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId) => productsApi.deleteVariant(product.id, variantId),
    onMutate: (variantId) => {
      setDeletingVariantIds(prev => new Set([...prev, variantId]))
    },
    onSettled: (_, __, variantId) => {
      setDeletingVariantIds(prev => { const s = new Set(prev); s.delete(variantId); return s })
    },
    onSuccess: () => {
      toast.success('Variant deleted')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to delete variant'),
  })

  // ── New product: batch save ─────────────────────────────────────────────────
  const batchSave = async (overrideStatus) => {
    if (isSavingRef.current) return
    isSavingRef.current = true

    // WARN FIX: reset isCriticalFailureRef at the start of every save attempt
    // so a retry after a step-1 failure starts with a clean slate
    isCriticalFailureRef.current = false

    const data = payload()
    if (overrideStatus) data.status = overrideStatus

    if (data.title.length < 2) { toast.error('Product title must be at least 2 characters'); isSavingRef.current = false; return }
    if (overrideStatus === 'published' && localVariants.length === 0) {
      toast.error('Add at least one variant before publishing'); isSavingRef.current = false; return
    }

    const imgCount = localImages.length
    const varCount = localVariants.length
    const steps = [
      { id: 'create-product', label: 'Create product', status: 'pending', details: null },
      ...(imgCount > 0 ? [{ id: 'upload-images', label: `Upload ${imgCount} image${imgCount > 1 ? 's' : ''}`, status: 'pending', details: null }] : []),
      ...(varCount > 0 ? [{ id: 'create-variants', label: `Create ${varCount} variant${varCount > 1 ? 's' : ''}`, status: 'pending', details: null }] : []),
    ]

    const updateStep = (id, updates) => {
      setSaveSteps(prev => prev ? prev.map(s => s.id === id ? { ...s, ...updates } : s) : prev)
    }

    setSaveSteps(steps)
    let createdProduct = null
    let hadPartialFailure = false

    try {
      updateStep('create-product', { status: 'loading' })
      const res = await productsApi.create(data)
      createdProduct = res.data
      updateStep('create-product', { status: 'done' })
    } catch (e) {
      isCriticalFailureRef.current = true
      updateStep('create-product', { status: 'error', details: e.response?.data?.detail || 'Failed to create product' })
      toast.error(e.response?.data?.detail || 'Failed to create product')
      isSavingRef.current = false
      return
    }

    if (imgCount > 0) {
      updateStep('upload-images', { status: 'loading' })
      let imgSucceeded = 0
      let imgFailed = 0
      for (let i = localImages.length - 1; i >= 0; i--) {
        const img = localImages[i]
        const fd = new FormData()
        fd.append('file', img.file)
        fd.append('set_as_primary', i === 0 ? 'true' : 'false')
        try {
          await productsApi.uploadImage(createdProduct.id, fd)
          imgSucceeded++
        } catch (_) {
          imgFailed++
        }
      }
      if (imgFailed === 0) {
        updateStep('upload-images', { status: 'done', details: `${imgSucceeded} uploaded` })
      } else {
        hadPartialFailure = true
        updateStep('upload-images', {
          status: imgSucceeded > 0 ? 'done' : 'error',
          details: `${imgSucceeded} uploaded, ${imgFailed} failed`,
        })
        toast.error(imgSucceeded > 0
          ? `${imgFailed} image${imgFailed > 1 ? 's' : ''} failed — add them later`
          : 'Image upload failed — add images later via Edit')
      }
    }

    if (varCount > 0) {
      updateStep('create-variants', { status: 'loading' })
      try {
        const variantsPayload = localVariants.map(({ _localId, ...v }) => v)
        const bulkRes = await productsApi.bulkCreateVariants(createdProduct.id, variantsPayload)
        const { total_created: varSucceeded, total_failed: varFailed, failed: failedItems } = bulkRes.data
        if (varFailed === 0) {
          updateStep('create-variants', { status: 'done', details: `${varSucceeded} created` })
        } else {
          hadPartialFailure = true
          const firstError = failedItems?.[0]?.error || 'unknown error'
          updateStep('create-variants', {
            status: varSucceeded > 0 ? 'done' : 'error',
            details: `${varSucceeded} created, ${varFailed} failed — ${firstError}`,
          })
          toast.error(`${varFailed} variant${varFailed > 1 ? 's' : ''} failed — you can add them later`)
        }
      } catch (e) {
        hadPartialFailure = true
        updateStep('create-variants', {
          status: 'error',
          details: e.response?.data?.detail || 'Variant creation failed',
        })
        toast.error('Variant creation failed — you can add them later via Edit')
      }
    }

    revokeObjectURLs(localImages)
    await new Promise(r => setTimeout(r, hadPartialFailure ? 1500 : 800))

    if (!hadPartialFailure) {
      toast.success(overrideStatus === 'published' ? 'Product published!' : 'Product created!')
      qc.invalidateQueries({ queryKey: ['products'] })
      setSaveSteps(null)
      isSavingRef.current = false
      onClose()
    } else {
      qc.invalidateQueries({ queryKey: ['products'] })
      isSavingRef.current = false
    }
  }

  const handleOverlayClose = useCallback(() => {
    setSaveSteps(null)
    if (isCriticalFailureRef.current) {
      isCriticalFailureRef.current = false
      // Product was never created — keep form open so user's work is preserved
    } else {
      onClose()
    }
  }, [onClose])

  // ── Local image handlers (new product only) ──────────────────────────────────
  const localFileRef = useRef(null)
  const pickLocalImage = useCallback((f) => {
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type)) { toast.error('Only JPG, PNG, WebP allowed'); return }
    if (f.size > MAX_FILE_SIZE) { toast.error('File must be under 5 MB'); return }
    setLocalImages(prev => {
      if (prev.length >= MAX_IMAGES) { toast.error(`Maximum ${MAX_IMAGES} images allowed`); return prev }
      if (isDuplicateFile(f, prev)) { toast.error('This image is already added'); return prev }
      return [...prev, { id: genLocalId(), file: f, previewUrl: URL.createObjectURL(f) }]
    })
    if (localFileRef.current) localFileRef.current.value = ''
  }, [])

  const removeLocalImage = useCallback((id) => {
    setLocalImages(prev => {
      const item = prev.find(img => img.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(img => img.id !== id)
    })
  }, [])

  const addLocalVariant = useCallback((v) => setLocalVariants(prev => [...prev, v]), [])
  const removeLocalVariant = useCallback((id) => setLocalVariants(prev => prev.filter(v => v._localId !== id)), [])

  // ── Render ───────────────────────────────────────────────────────────────────
  const thumbnailUrl = isEdit ? getImageUrl(product?.thumbnail) : (localImages[0]?.previewUrl || null)
  const variants = isEdit ? (product?.variants || []) : localVariants
  const isBatchSaving = saveSteps !== null

  return (
    <>
      {isBatchSaving && <SaveProgressOverlay steps={saveSteps} onClose={handleOverlayClose} />}

      <div className="inv-form-panel">
        <div className="inv-form-header">
          <h3>{isEdit ? `Editing: ${product.title}` : 'Add New Product'}</h3>
          <button type="button" onClick={handleClose} disabled={isBatchSaving} aria-label="Close form" className="text-muted hover:text-app p-1 rounded transition-colors disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => {
          e.preventDefault()
          if (isSavingRef.current || editMutation.isPending || editPubMutation.isPending) return
          if (isEdit) editMutation.mutate(payload())
          else batchSave()
        }}>
          <div className="inv-form-body">
            {/* LEFT: image */}
            <div className="inv-image-col">
              {isEdit ? (
                <>
                  <div className="inv-image-box" onClick={() => onOpenImage(product)} title="Click to manage image">
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
                  {localImages.length > 1 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {localImages.slice(1).map(img => (
                        <div key={img.id} className="relative w-8 h-9 rounded overflow-hidden border border-app">
                          <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeLocalImage(img.id)}
                            aria-label="Remove image"
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
                    <button type="button" onClick={() => removeLocalImage(localImages[0].id)}
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
                <label htmlFor="product-title">Product Name <span className="text-red-400">*</span></label>
                <div className="inv-field">
                  <input id="product-title" className="inv-input" value={form.title} onChange={e => set('title', e.target.value)} required minLength={2} placeholder="e.g. Classic Black Tee" />
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
                <label>Collection</label>
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
                  <label>Tags</label>
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
                  {variants.map((v) => (
                    <tr key={isEdit ? v.id : v._localId}>
                      <td><span className="inv-size-chip">{v.size}</span></td>
                      <td>{formatPrice(v.original_price)}</td>
                      <td>{formatPrice(v.selling_price)}</td>
                      <td>{v.discount_percentage ? `${parseFloat(v.discount_percentage).toFixed(0)}%` : '—'}</td>
                      <td>{isEdit ? <StockBadge stock={v.stock_quantity} /> : <span className="text-xs text-app">{v.stock_quantity}</span>}</td>
                      <td>
                        {isEdit ? (
                          // CRITICAL 1 FIX: was toast stub, now real API delete
                          <button
                            type="button"
                            className="btn-tbl-delete"
                            style={{ width: 22, height: 22 }}
                            disabled={deletingVariantIds.has(v.id)}
                            onClick={() => deleteVariantMutation.mutate(v.id)}
                            aria-label="Delete variant"
                          >
                            {deletingVariantIds.has(v.id)
                              ? <Spinner size="sm" />
                              : <Trash2 size={10} />}
                          </button>
                        ) : (
                          <button type="button" className="btn-tbl-delete" style={{ width: 22, height: 22 }}
                            onClick={() => removeLocalVariant(v._localId)} aria-label="Remove variant">
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

            {isEdit ? (
              <button type="button" onClick={() => onOpenVariant(product)} className="inv-add-variant-btn">
                <Plus size={12} /> Add Variant
              </button>
            ) : (
              <LocalVariantForm onAdd={addLocalVariant} existingVariants={localVariants} />
            )}
          </div>

          {/* Description */}
          <div className="inv-desc-section">
            <p className="inv-section-label">Description</p>
            <textarea className="inv-input" rows={3} style={{ resize: 'none', width: '100%' }}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Product description…" />
          </div>

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

          <div className="inv-form-footer">
            <div className="inv-footer-row">
              <button type="submit" className="btn-inv-save" disabled={isBatchSaving || editMutation.isPending}>
                {(isBatchSaving || editMutation.isPending) ? <Spinner size="sm" /> : 'Save'}
              </button>
              <button
                type="button"
                className="btn-inv-publish"
                disabled={isBatchSaving || editPubMutation?.isPending}
                onClick={() => {
                  if (isSavingRef.current || editPubMutation?.isPending) return
                  if (isEdit) editPubMutation.mutate(payload())
                  else batchSave('published')
                }}
              >
                {(isBatchSaving || editPubMutation?.isPending) ? <Spinner size="sm" /> : 'Publish'}
              </button>
            </div>
            <button type="button" className="btn-inv-cancel" onClick={handleClose} disabled={isBatchSaving}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  )
}