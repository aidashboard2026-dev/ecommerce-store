import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, ImageIcon, Upload, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/shared/components/ui/Modal'
import Input from '@/shared/components/ui/Input'
import Select from '@/shared/components/ui/Select'
import Button from '@/shared/components/ui/Button'
import { productsAPI as productsApi } from '@/shared/services/api'
import useBusinessLimits from '@/shared/hooks/useBusinessLimits'
import { getImageUrl, getApiErrorMessage } from '@/shared/utils/productUtils'


const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const BLANK_VARIANT_FORM = {
  size: 'M', color: '', color_hex: '', sku: '',
  original_price: '', selling_price: '', discount_percentage: '',
  stock_quantity: 0, low_stock_threshold: 5,
  barcode: '', status: 'active', image_url: '',
}

export default function VariantFormModal({ isOpen, onClose, productId, product, editingVariantId }) {
  const qc = useQueryClient()
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits()
  const [form, setForm] = useState(BLANK_VARIANT_FORM)
  const [uploadingImage, setUploadingImage] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const isEditMode = editingVariantId !== null && editingVariantId !== undefined

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        const variant = product?.variants?.find(v => v.id === editingVariantId)
        if (variant) {
          setForm({
            size: variant.size,
            color: variant.color || '',
            color_hex: variant.color_hex || '',
            sku: variant.sku || '',
            original_price: String(variant.original_price),
            selling_price: String(variant.selling_price),
            discount_percentage: String(variant.discount_percentage || '0'),
            stock_quantity: variant.stock_quantity,
            low_stock_threshold: variant.low_stock_threshold || 5,
            barcode: variant.barcode || '',
            status: variant.status || 'active',
            image_url: variant.image_url || '',
          })
        }
      } else {
        setForm(BLANK_VARIANT_FORM)
      }
    }
  }, [isOpen, editingVariantId, product, isEditMode])

  useEffect(() => {
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (orig > 0 && sell > 0 && sell <= orig) {
      set('discount_percentage', (((orig - sell) / orig) * 100).toFixed(2))
    }
  }, [form.original_price, form.selling_price])

  const mutation = useMutation({
    mutationFn: data => {
      if (isEditMode) {
        return productsApi.updateVariant(productId, editingVariantId, data)
      } else {
        return productsApi.createVariant(productId, data)
      }
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Variant updated successfully.' : 'Variant added successfully.')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', productId] })
      qc.invalidateQueries({ queryKey: ['product'] })
      onClose()
    },
    onError: e => toast.error(getApiErrorMessage(e, 'SKU may already exist')),
  })

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const res = await productsApi.uploadImage(productId, file, 'gallery', false)
      const url = res.data.url
      set('image_url', url)
      toast.success('Variant image uploaded successfully.')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to upload image'))
    } finally {
      setUploadingImage(false)
    }
  }

  const existingVariants = product?.variants || []
  const newColorNormalized = form.color ? form.color.trim().toLowerCase() : ""
  const uniqueColorsNormalized = new Set(existingVariants.map(v => v.color ? v.color.trim().toLowerCase() : "").filter(Boolean))
  const newSizeNormalized = form.size ? form.size.trim().toUpperCase() : ""
  const uniqueSizesNormalized = new Set(existingVariants.map(v => v.size ? v.size.trim().toUpperCase() : "").filter(Boolean))

  const isVariantsLimitReached = limits ? existingVariants.length >= limits.max_product_variants : false
  const isSizesLimitReached = (limits && newSizeNormalized && !uniqueSizesNormalized.has(newSizeNormalized)) ? uniqueSizesNormalized.size >= limits.max_sizes : false
  const isColorsLimitReached = (limits && newColorNormalized && !uniqueColorsNormalized.has(newColorNormalized)) ? uniqueColorsNormalized.size >= limits.max_colors : false
  
  const showLimits = !isEditMode
  const anyLimitReached = showLimits && (!limits || isVariantsLimitReached || isSizesLimitReached || isColorsLimitReached)
  const disabledTitle = limitsLoading ? "Loading store configuration..." : limitsError ? "Unable to load configuration" : anyLimitReached ? `Maximum limit reached.\nDelete an existing item to continue.` : ""

  const handleSubmit = e => {
    e.preventDefault()
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (sell > orig) { toast.error('Selling price cannot exceed original price'); return }

    if (!isEditMode) {
      if (isVariantsLimitReached) {
        toast.error(
          <div>
            <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
            <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
              You have reached the maximum allowed limit of {limits.max_product_variants} variants for this product.{"\n"}Please delete an existing variant before adding a new one.
            </div>
          </div>
        );
        return
      }
      if (isSizesLimitReached) {
        toast.error(
          <div>
            <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
            <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
              You have reached the maximum allowed limit of {limits.max_sizes} sizes for this product.{"\n"}Please delete an existing size before adding a new one.
            </div>
          </div>
        );
        return
      }
      if (isColorsLimitReached) {
        toast.error(
          <div>
            <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
            <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
              You have reached the maximum allowed limit of {limits.max_colors} colors for this product.{"\n"}Please delete an existing color before adding a new one.
            </div>
          </div>
        );
        return
      }
    }

    mutation.mutate({
      size: form.size,
      color: form.color ? form.color.trim() : null,
      color_hex: form.color_hex ? form.color_hex.trim() : null,
      sku: form.sku.trim() || undefined,
      original_price: orig,
      selling_price: sell,
      discount_percentage: parseFloat(form.discount_percentage) || 0,
      stock_quantity: parseInt(form.stock_quantity || 0, 10),
      low_stock_threshold: parseInt(form.low_stock_threshold || 5, 10),
      barcode: form.barcode ? form.barcode.trim() : null,
      status: form.status,
      image_url: form.image_url || null,
    })
  }

  const sellNum = parseFloat(form.selling_price || 0)
  const origNum = parseFloat(form.original_price || 0)
  const priceError = !isNaN(sellNum) && !isNaN(origNum) && sellNum > origNum

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Variant" : "Add Variant"} size='2xl'>
      <form onSubmit={handleSubmit} className="space-y-4 p-8">
        {limitsLoading && (
          <div className="flex items-center gap-2 justify-center py-4 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading store limits...</span>
          </div>
        )}
        {limitsError && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Unable to load store limits.</span>
            </div>
            <button
              type="button"
              onClick={() => refetchLimits()}
              className="px-2.5 py-0.5 rounded bg-red-500 text-white font-bold text-[10px]"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Size"
            value={form.size}
            onChange={e => set('size', e.target.value)}
            options={SIZE_OPTIONS.map(s => ({ value: s, label: s }))}
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
          />
          <Input
            label="Color"
            value={form.color}
            onChange={e => set('color', e.target.value)}
            placeholder="Black"
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Color Hex"
            value={form.color_hex}
            onChange={e => set('color_hex', e.target.value)}
            placeholder="#1A1A1A"
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            rightSlot={
              /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color_hex) ? (
                <span className="w-4 h-4 rounded-full border border-app" style={{ backgroundColor: form.color_hex }} />
              ) : null
            }
          />
          <Input
            label="SKU"
            helperText={isEditMode ? undefined : "Leave blank to auto-generate"}
            value={form.sku}
            onChange={e => set('sku', e.target.value)}
            placeholder="auto: CBT-BLK-M-001"
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
          />
        </div>

        {/* New fields: Barcode & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Barcode"
            value={form.barcode}
            onChange={e => set('barcode', e.target.value)}
            placeholder="e.g. 123456789012"
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={e => set('status', e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
          />
        </div>

        {/* New field: Variant Image */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Variant Image</label>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-app bg-surface/30">
            {form.image_url ? (
              <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-app bg-surface flex-shrink-0">
                <img
                  src={getImageUrl(form.image_url)}
                  alt="Variant"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-app bg-surface/40 flex items-center justify-center text-muted flex-shrink-0">
                <ImageIcon size={24} className="opacity-40" />
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <label className="btn-secondary rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer hover:bg-brand-500 hover:text-white transition-colors flex items-center gap-1.5">
                  {uploadingImage ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  {form.image_url ? 'Replace Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
                {form.image_url && (
                  <button
                    type="button"
                    onClick={() => set('image_url', '')}
                    className="btn-secondary rounded-lg text-xs font-semibold px-3 py-1.5 text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted">JPG, PNG, WebP · max 10 MB</p>
            </div>
          </div>
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
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
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
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
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
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Input
            label="Low Stock Alert"
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={e => set('low_stock_threshold', e.target.value)} placeholder='0'
            disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            variant="addvariant"
            disabled={mutation.isPending || priceError || (!isEditMode && anyLimitReached)}
            title={disabledTitle}
            className="flex"
          >
            {mutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {isEditMode ? "Save Changes" : "Add Variant"}
          </Button>

          <Button  type="button"  variant="delete"  onClick={onClose}  className="sm:px-6">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}