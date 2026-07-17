import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/shared/components/ui/Modal'
import Input from '@/shared/components/ui/Input'
import Select from '@/shared/components/ui/Select'
import Button from '@/shared/components/ui/Button'
import { productsAPI as productsApi } from '@/shared/services/api'
import useBusinessLimits from '@/shared/hooks/useBusinessLimits'
import { getApiErrorMessage } from '@/shared/utils/productUtils'

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const BLANK_VARIANT_FORM = {
  size: 'M',
  color: '',
  color_hex: '',
  sku: '',
  original_price: '',
  selling_price: '',
  discount_percentage: '',
  stock_quantity: '',
  low_stock_threshold: 5,
  barcode: '',
  status: 'active',
  image_url: '',
}

function FormField({ label, required, hint, htmlFor, children }) {
  return (
    <div className="space-y-1 text-left">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="block text-[11px] font-medium text-muted"
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted italic">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function StyledInput({ className, ...props }) {
  return <Input className={`py-1.5 text-sm ${className || ""}`} {...props} />
}

// ─── Creatable size selector with suggestions ─────────────────────────────────

function CreatableSizeSelect({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const containerRef = useRef(null)

  useEffect(() => {
    setSearch(value || '')
  }, [value])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        const trimmed = search.trim()
        if (trimmed && trimmed !== value) {
          onChange(trimmed)
        } else {
          setSearch(value || '')
        }
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [search, value, onChange])

  const SUGGESTED_SIZES = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL',
    '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42', '44',
    'Free Size', '3XL'
  ]

  const filteredSuggestions = SUGGESTED_SIZES.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  )

  const showCreateOption = search.trim() !== '' && !SUGGESTED_SIZES.some(s => s.toLowerCase() === search.trim().toLowerCase())

  const handleSelect = (val) => {
    onChange(val)
    setSearch(val)
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const trimmed = search.trim()
      if (trimmed) {
        handleSelect(trimmed)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch(value || '')
    }
  }

  const inputRef = React.useRef(null)

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or type size..."
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="w-full py-1.5 pl-3 pr-8 text-sm bg-surface border border-app rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-muted disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => { if (!disabled) setIsOpen(prev => !prev) }}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-app p-0.5 focus:outline-none disabled:opacity-50"
        >
          <ChevronDown size={14} className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-app rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-500/10 hover:text-brand-500 transition-colors focus:outline-none"
              >
                {s}
              </button>
            ))
          ) : !showCreateOption ? (
            <div className="px-3 py-2 text-xs text-muted">No suggestions</div>
          ) : null}

          {showCreateOption && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full text-left px-3 py-1.5 text-xs text-brand-500 font-semibold border-t border-app hover:bg-brand-500/10 transition-colors focus:outline-none"
            >
              Create "{search.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CreatableColorSelect({ value, onChange, onHexChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const [resolving, setResolving] = useState(false)
  const containerRef = useRef(null)

  const { data: backendColors = [] } = useQuery({
    queryKey: ['backend-colors'],
    queryFn: async () => {
      const res = await productsApi.getColors()
      return res.data || []
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  useEffect(() => {
    setSearch(value || '')
  }, [value])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        const trimmed = search.trim()
        if (trimmed && trimmed !== value) {
          handleSelect(trimmed)
        } else {
          setSearch(value || '')
        }
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [search, value, onChange, backendColors])

  const filteredSuggestions = backendColors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const showCreateOption = search.trim() !== '' && !backendColors.some(c => c.name.toLowerCase() === search.trim().toLowerCase())

  const handleSelect = async (val) => {
    const matched = backendColors.find(c => c.name.toLowerCase() === val.toLowerCase())
    onChange(val)
    setSearch(val)
    if (matched) {
      onHexChange(matched.hex)
    } else {
      setResolving(true)
      try {
        const res = await productsApi.resolveColor(val)
        if (res.data?.found && res.data.hex) {
          onHexChange(res.data.hex)
        }
      } catch {
        // resolve failed — leave hex editable
      } finally {
        setResolving(false)
      }
    }
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const trimmed = search.trim()
      if (trimmed) {
        handleSelect(trimmed)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch(value || '')
    }
  }

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or type color..."
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="w-full py-1.5 pl-3 pr-8 text-sm bg-surface border border-app rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-muted disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => { if (!disabled) setIsOpen(prev => !prev) }}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-app p-0.5 focus:outline-none disabled:opacity-50"
        >
          <ChevronDown size={14} className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-app rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleSelect(c.name)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-500/10 hover:text-brand-500 transition-colors focus:outline-none flex items-center justify-between"
              >
                <span>{c.name}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted font-mono">{c.hex}</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-app" style={{ backgroundColor: c.hex }} />
                </span>
              </button>
            ))
          ) : !showCreateOption ? (
            <div className="px-3 py-2 text-xs text-muted">No suggestions</div>
          ) : null}

          {showCreateOption && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full text-left px-3 py-1.5 text-xs text-brand-500 font-semibold border-t border-app hover:bg-brand-500/10 transition-colors focus:outline-none"
            >
              Create "{search.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StyledSelect({ children, className, ...props }) {
  return (
    <Select className={`py-1.5 text-sm ${className || ""}`} {...props}>
      {children}
    </Select>
  )
}

export default function VariantFormModal({ isOpen, onClose, productId, product, editingVariantId }) {
  const qc = useQueryClient()
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits()
  const [form, setForm] = useState(BLANK_VARIANT_FORM)
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
            stock_quantity: String(variant.stock_quantity ?? ''),
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
      console.log('[DEBUG] [Modal] Variant API request start', { productId, editingVariantId, data })
      if (isEditMode) {
        return productsApi.updateVariant(productId, editingVariantId, data)
      } else {
        return productsApi.createVariant(productId, data)
      }
    },
    onSuccess: (response) => {
      console.log('[DEBUG] [Modal] Variant API success response', response)
      toast.success(isEditMode ? 'Variant updated successfully.' : 'Variant added successfully.')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', productId] })
      qc.invalidateQueries({ queryKey: ['product'] })
      onClose()
    },
    onError: e => {
      console.error('[DEBUG] [Modal] Variant API error', e)
      toast.error(getApiErrorMessage(e, 'SKU may already exist'))
    },
  })

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
    if (e && e.preventDefault) e.preventDefault()
    if (e && e.stopPropagation) e.stopPropagation()
    console.log('[DEBUG] [Modal] Variant form submission triggered', { isEditMode, editingVariantId, form })
    if (!limits) {
      toast.error("Store limits not loaded yet. Please wait.")
      return
    }
    const trimmedSize = form.size ? form.size.trim() : "";
    const trimmedColor = form.color ? form.color.trim() : "";
    if (!trimmedSize) {
      toast.error("Size is required");
      return;
    }
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (sell > orig) {
      toast.error('Selling price cannot exceed original price')
      return
    }

    // Prevent duplicate size and color combination
    const dupExists = existingVariants.some(
      (v) => v.id !== editingVariantId && (v.size || "").trim().toLowerCase() === trimmedSize.toLowerCase() && (v.color || "").trim().toLowerCase() === trimmedColor.toLowerCase(),
    );
    if (dupExists) {
      toast.error(
        `Variant with size "${trimmedSize}" and color "${trimmedColor || "none"}" already exists`,
      );
      return;
    }

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
      size: trimmedSize,
      color: trimmedColor || null,
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
  const priceError = !isNaN(sellNum) && !isNaN(origNum) && sellNum > origNum && form.selling_price !== ""

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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center text-center">
          <FormField label="Size" required>
            <CreatableSizeSelect
              value={form.size}
              onChange={val => set('size', val)}
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            />
          </FormField>
          <FormField label="Color">
            <CreatableColorSelect
              value={form.color}
              onChange={val => set('color', val)}
              onHexChange={hex => set('color_hex', hex)}
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            />
          </FormField>
          <FormField label="Color Hex">
            <div className="relative">
              <StyledInput
                value={form.color_hex}
                onChange={e => set('color_hex', e.target.value)}
                placeholder="#1A1A1A"
                disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              />
              {/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color_hex) && (
                <span
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-app"
                  style={{ background: form.color_hex }}
                />
              )}
            </div>
          </FormField>
          <FormField label="SKU" hint="auto if blank">
            <StyledInput
              value={form.sku}
              onChange={e => set('sku', e.target.value)}
              placeholder="auto"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <FormField label="Original Price" required>
            <StyledInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.original_price}
              onChange={e => set('original_price', e.target.value)}
              placeholder="999"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormField>
          <FormField label="Selling Price" required>
            <StyledInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.selling_price}
              onChange={e => set('selling_price', e.target.value)}
              placeholder="799"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className={`${priceError ? 'border-red-400 focus:ring-red-400/30' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
          </FormField>
          <FormField label="Discount %">
            <StyledInput
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discount_percentage}
              onChange={e => set('discount_percentage', e.target.value)}
              placeholder="0"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              readOnly={!!(form.original_price && form.selling_price)}
            />
          </FormField>
          <FormField label="Stock">
            <StyledInput
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={e => set('stock_quantity', e.target.value)}
              placeholder="Enter Stock Quantity"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormField>
          <FormField label="Low Stock Alert">
            <StyledInput
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={e => set('low_stock_threshold', e.target.value)}
              placeholder="5"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormField>
        </div>

        {priceError && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Selling price cannot exceed original price
          </p>
        )}

        <div className="flex items-center gap-2 w-full pt-4">
          <Button
            type="submit"
            disabled={mutation.isPending || priceError || (!isEditMode && anyLimitReached)}
            title={disabledTitle}
            variant="addvariant"
            className="min-w-[100px] whitespace-nowrap hover:bg-sky-400 hover:border-sky-600"
          >
            {mutation.isPending && (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            )}
            {isEditMode ? "Save Changes" : "Add Variant"}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="delete"
            className="whitespace-nowrap hover:bg-red-500 hover:border hover:border-red-500"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}