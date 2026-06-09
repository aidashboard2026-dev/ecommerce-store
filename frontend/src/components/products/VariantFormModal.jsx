import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Spinner from '../common/Spinner'
import { productsAPI as productsApi } from '../../services/api'

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const BLANK_VARIANT_FORM = {
  size: 'M', color: '', color_hex: '', sku: '',
  original_price: '', selling_price: '', discount_percentage: '',
  stock_quantity: 0, low_stock_threshold: 5,
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

function StyledInput(props) { return <input className={inputCls} {...props} /> }
function StyledSelect({ children, ...props }) {
  return (
    <select className={`${inputCls} appearance-none`} {...props}>
      {children}
    </select>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function VariantFormModal({ isOpen, onClose, productId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(BLANK_VARIANT_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { if (isOpen) setForm(BLANK_VARIANT_FORM) }, [isOpen])

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