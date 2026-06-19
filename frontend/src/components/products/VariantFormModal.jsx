import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { productsAPI as productsApi } from '../../services/api'

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const BLANK_VARIANT_FORM = {
  size: 'M', color: '', color_hex: '', sku: '',
  original_price: '', selling_price: '', discount_percentage: '',
  stock_quantity: 0, low_stock_threshold: 5,
}

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
    <Modal isOpen={isOpen} onClose={onClose} title="Add Variant" size='2xl'>
      <form onSubmit={handleSubmit} className="space-y-4 p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Size"
            value={form.size}
            onChange={e => set('size', e.target.value)}
            options={SIZE_OPTIONS.map(s => ({ value: s, label: s }))}
          />
          <Input
            label="Color"
            value={form.color}
            onChange={e => set('color', e.target.value)}
            placeholder="Black"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Color Hex"
            value={form.color_hex}
            onChange={e => set('color_hex', e.target.value)}
            placeholder="#1A1A1A"
            rightSlot={
              /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color_hex) ? (
                <span className="w-4 h-4 rounded-full border border-app" style={{ backgroundColor: form.color_hex }} />
              ) : null
            }
          />
          <Input
            label="SKU"
            helperText="Leave blank to auto-generate"
            value={form.sku}
            onChange={e => set('sku', e.target.value)}
            placeholder="auto: CBT-BLK-M-001"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Original Price"
            type="number"
            min="0.01"
            step="0.01"
            value={form.original_price}
            onChange={e => set('original_price', e.target.value)}
            required
            placeholder="999"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Input
            label="Selling Price"
            type="number"
            min="0.01"
            step="0.01"
            value={form.selling_price}
            onChange={e => set('selling_price', e.target.value)}
            required
            placeholder="799"
            error={priceError ? 'Price exceeds original' : undefined}
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Input
            label="Discount %"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.discount_percentage}
            onChange={e => set('discount_percentage', e.target.value)}
            placeholder="0"
            disabled
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        {priceError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 -mt-2">
            <AlertTriangle size={12} /> Selling price cannot exceed original price
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Stock"
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={e => set('stock_quantity', e.target.value)}
            placeholder='0'
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Input
            label="Low Stock Alert"
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={e => set('low_stock_threshold', e.target.value)} placeholder='0'
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button type="submit" variant="addvariant" disabled={mutation.isPending || priceError} className="flex">
            {mutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Add Variant
          </Button>

          <Button  type="button"  variant="delete"  onClick={onClose}  className="sm:px-6">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}