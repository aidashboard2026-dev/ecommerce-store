import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, Camera, ImageIcon, 
  AlertTriangle, CheckCircle, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  customProductsAPI,
  customCategoriesAPI,
} from "@/shared/services/api"
import {
  formatPrice, getImageUrl, revokeObjectURLs, genLocalId, isDuplicateFile,
} from '@/shared/utils/productUtils'
import Select from '@/shared/components/ui/Select'
import Badge from '@/shared/components/ui/Badge'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/Table'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['draft', 'published', 'archived']
const MAX_IMAGES     = 7
const MAX_FILE_SIZE  = 10 * 1024 * 1024
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const SIZE_OPTIONS   = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
// COLLECTION_OPTIONS kept from branch — used as fallback display labels only;
// the actual dropdown is driven by the collections API (FK-based).
// const COLLECTION_OPTIONS = [
//   'Oversized', 'Essentials', 'Streetwear', 'Bottoms',
//   'Summer', 'Hoodies', 'Joggers', 'Limited Edition',
// ]

// ─── Blank variant form (module-level — stable ref, no hook needed) ───────────

// const BLANK_VARIANT_FORM = {
//   size: 'M', color: '', color_hex: '', sku: '',
//   original_price: '', selling_price: '', discount_percentage: '',
//   stock_quantity: '', low_stock_threshold: 5,
// }

// ─── Shared primitives ────────────────────────────────────────────────────────

// function FormField({ label, required, hint, htmlFor, children }) {
//   return (
//     <div className="space-y-1">
//       <div className="flex items-baseline justify-between">
//         <label htmlFor={htmlFor} className="block text-[11px] font-medium text-muted">
//           {label}{required && <span className="text-red-400 ml-0.5">*</span>}
//         </label>
//         {hint && <span className="text-[10px] text-muted italic">{hint}</span>}
//       </div>
//       {children}
//     </div>
//   )
// }

// Branch versions: properly use clsx + component props (HEAD had broken duplicate
// StyledInput definition and referenced undefined `inputCls`).
function StyledInput({ className, ...props }) {
  return <Input className={`py-1.5 text-sm ${className || ''}`} {...props} />
}

function StyledSelect({ children, className, ...props }) {
  return (
    <Select className={`py-1.5 text-sm ${className || ''}`} {...props}>
      {children}
    </Select>
  )
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ stock }) {
  if (stock === 0) return <Badge label="Out"             variant="danger"  dot />
  if (stock <= 5)  return <Badge label={`${stock} Low`}  variant="warning" dot />
  return                   <Badge label={`${stock} stock`} variant="success" />
}

// ─── Save Progress Overlay ────────────────────────────────────────────────────

function SaveProgressOverlay({ steps, onClose }) {
  const hasError = steps.some(s => s.status === 'error')
  const allDone  = steps.every(s => s.status === 'done' || s.status === 'error')
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label="Save progress">
      <div className="bg-app border border-app rounded-2xl p-6 w-80 shadow-2xl space-y-4">
        <p className="text-sm font-semibold text-app">
          {hasError && allDone ? 'Completed with issues' : 'Saving product…'}
        </p>
        <div className="space-y-3">
          {steps.map(step => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center mt-0.5">
                {step.status === 'done'    && <CheckCircle   size={18} className="text-green-500" />}
                {step.status === 'loading' && <Loader2       size={18} className="text-brand-500 animate-spin" />}
                {step.status === 'error'   && <AlertTriangle size={18} className="text-red-400" />}
                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-app" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-xs ${
                  step.status === 'done'    ? 'text-green-500 line-through' :
                  step.status === 'loading' ? 'text-app font-semibold'      :
                  step.status === 'error'   ? 'text-red-400'                : 'text-muted'
                }`}>{step.label}</span>
                {step.details && (
                  <p className={`text-[10px] mt-0.5 ${step.status === 'error' ? 'text-red-400/80' : 'text-muted'}`}>
                    {step.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Branch: <Button> component; HEAD had raw <button> — Button is correct here */}
        {hasError && allDone && onClose && (
          <Button type="button" onClick={onClose} variant="secondary" className="w-full">
            Close
          </Button>
        )}
      </div>
    </div>
  )
}



// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomProductForm({ product, onClose, onOpenVariant, onOpenImage }) {
  const qc     = useQueryClient()
  const isEdit = !!product

  // ─── Blank form ref ──────────────────────────────────────────────────────────
  const blankForm = useRef({
    title: '',
    description: '',
    short_description: '',

    custom_category_id: '',
    collection_id: '',

    status: 'draft',

    tags: '',

    original_price_min: '',
    original_price_max: '',

    selling_price_min: '',
    selling_price_max: '',

    stock_quantity: 0,

    size: 'All Size',

    is_featured: false,
    is_trending: false,
    is_best_seller: false,
    is_new_arrival: false,

    seo_title: '',
    seo_description: '',
  })

  // ─── Form state — must be declared BEFORE any hook that reads `form` ─────────
  const [form, setForm] = useState(blankForm.current)

  // ─── BUG-1 FIX: useQuery calls moved here, after `form` is declared ──────────
  const { data: categories = [] } = useQuery({
    queryKey: ['custom-categories', 'admin'],
    queryFn: () => customCategoriesAPI.list().then(r => r.data),
    staleTime: 5 * 60_000,
  })

  console.log("Categories =", categories)

  // const { data: collections = [] } = useQuery({
  //   // queryKey includes form.category_id so it refetches when category changes
  //   queryKey: ['collections', 'admin', form.category_id],
  //   queryFn: () =>
  //     customCollectionsAPI.list(form.category_id ? { category_id: form.category_id } : {})
  //       .then(r => r.data),
  //   staleTime: 5 * 60_000,
  // })

  // ─── Other state ─────────────────────────────────────────────────────────────
  const [localImages, setLocalImages]     = useState([])
  // const [localVariants, setLocalVariants] = useState([])
  const [saveSteps, setSaveSteps]         = useState(null)
  // const [deletingVariantIds, setDeletingVariantIds] = useState(() => new Set())

  const isSavingRef          = useRef(false)
  const isCriticalFailureRef = useRef(false)
  const localImagesRef       = useRef(localImages)
  const productRef           = useRef(product)
  const localFileRef         = useRef(null)

  useEffect(() => { localImagesRef.current = localImages }, [localImages])
  useEffect(() => { productRef.current = product }, [product])

  // Revoke blob URLs on unmount
  useEffect(() => () => revokeObjectURLs(localImagesRef.current), [])

  // Populate form when product prop changes (edit mode)
  useEffect(() => {
    revokeObjectURLs(localImagesRef.current)

    const p = productRef.current

    setForm(
      p
        ? {
            title: p.title || "",
            description: p.description || "",
            short_description: p.short_description || "",

            custom_category_id: p.custom_category_id || "",
            collection_id: p.collection_id || "",

            status: p.status || "draft",

            tags: Array.isArray(p.tags)
              ? p.tags.join(", ")
              : (p.tags || ""),

            original_price_min:
              p.original_price_min ?? "",

            original_price_max:
              p.original_price_max ?? "",

            selling_price_min:
              p.selling_price_min ?? "",

            selling_price_max:
              p.selling_price_max ?? "",

            stock_quantity:
              p.stock_quantity ?? 0,

            size:
              p.size || "All Size",

            is_featured:
              p.is_featured || false,

            is_trending:
              p.is_trending || false,

            is_best_seller:
              p.is_best_seller || false,

            is_new_arrival:
              p.is_new_arrival || false,

            seo_title:
              p.seo_title || "",

            seo_description:
              p.seo_description || "",
          }
        : blankForm.current
    )

    setLocalImages([])
  }, [product?.id])

  // ─── Unsaved-changes guard ────────────────────────────────────────────────────

  const hasUnsavedChanges = useMemo(() => {
    if (isEdit) return false
    return (
      localImages.length > 0 ||
      form.title.trim() !== '' || form.description.trim() !== ''
    )
  }, [isEdit, localImages.length, form.title, form.description])

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

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const payload = () => ({
    ...form,

    title: form.title.trim(),

    custom_category_id:
        form.custom_category_id
            ? Number(form.custom_category_id)
            : null,

    // collection_id:
    //   form.collection_id
    //     ? Number(form.collection_id)
    //     : null,

    original_price_min:
      Number(form.original_price_min),

    original_price_max:
      Number(form.original_price_max),

    selling_price_min:
      Number(form.selling_price_min),

    selling_price_max:
      Number(form.selling_price_max),

    stock_quantity:
      Number(form.stock_quantity),

    tags:
      form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
  })

  // ─── Edit mutations ───────────────────────────────────────────────────────────

  const editMutation = useMutation({
    mutationFn: data => customProductsAPI.update(product.id, data),
    onSuccess: () => { toast.success('Product updated successfully.'); qc.invalidateQueries({queryKey: ['custom-products']}); onClose() },
    onError: e => toast.error(
      e?.response?.data?.detail ||
      e?.message ||
      'Something went wrong'
    )
  })

  const editPubMutation = useMutation({
    mutationFn: data => customProductsAPI.update(product.id, { ...data, status: 'published' }),
    onSuccess: () => { toast.success('Product published successfully.'); qc.invalidateQueries({queryKey: ['custom-products']}); onClose() },
    onError: e => toast.error(
      e?.response?.data?.detail ||
      e?.message ||
      'Something went wrong'
    )
  })

  // ─── Variant delete mutation (edit mode) ──────────────────────────────────────

  // const deleteVariantMutation = useMutation({
  //   mutationFn: variantId => productsApi.deleteVariant(product.id, variantId),
  //   onMutate:  variantId  => setDeletingVariantIds(prev => new Set([...prev, variantId])),
  //   onSettled: (_, __, variantId) => setDeletingVariantIds(prev => {
  //     const s = new Set(prev); s.delete(variantId); return s
  //   }),
  //   onSuccess: () => { toast.success('Variant deleted'); qc.invalidateQueries({ queryKey: ['products'] }) },
  //   onError: e => toast.error(e.response?.data?.detail || 'Failed to delete variant'),
  // })

  // ─── New product: batch save ──────────────────────────────────────────────────

  const batchSave = async (overrideStatus) => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    isCriticalFailureRef.current = false

    const data = payload()
    if (overrideStatus) data.status = overrideStatus

    if (data.title.length < 2) {
      toast.error('Product title must be at least 2 characters')
      isSavingRef.current = false
      return
    }
    // if (overrideStatus === 'published' && localVariants.length === 0) {
    //   toast.error('Add at least one variant before publishing')
    //   isSavingRef.current = false
    //   return
    // }

    const imgCount = localImages.length
    // const varCount = localVariants.length

    const steps = [
      { id: 'create-product',  label: 'Create product',                                              status: 'pending', details: null },
      ...(imgCount > 0 ? [{ id: 'upload-images',   label: `Upload ${imgCount} image${imgCount > 1 ? 's' : ''}`,   status: 'pending', details: null }] : []),
      // ...(varCount > 0 ? [{ id: 'create-variants', label: `Create ${varCount} variant${varCount > 1 ? 's' : ''}`, status: 'pending', details: null }] : []),
    ]

    const updateStep = (id, updates) =>
      setSaveSteps(prev => prev ? prev.map(s => s.id === id ? { ...s, ...updates } : s) : prev)

    setSaveSteps(steps)
    let createdProduct    = null
    let hadPartialFailure = false

    // ── Step 1: Create product ──────────────────────────────────────────────────
    try {
      updateStep('create-product', { status: 'loading' })
      const res =await customProductsAPI.create(data)
      createdProduct = res.data
      updateStep('create-product', { status: 'done' })
    // } catch (e) {

    //     isCriticalFailureRef.current = true

    //     const errorMessage =
    //       Array.isArray(e?.response?.data?.detail)
    //         ? e.response.data.detail
    //             .map(err => err.msg)
    //             .join(', ')
    //         : String(
    //             e?.response?.data?.detail ||
    //             'Failed to create product'
    //           )

    //     updateStep('create-product', {
    //       status: 'error',
    //       details: errorMessage
    //     })

    //     toast.error(errorMessage)

    //     isSavingRef.current = false

    //     return
    //   }
    }catch (e) {
        console.log("========== CREATE PRODUCT ERROR ==========");
        console.log(e);
        console.log("Status:", e?.response?.status);
        console.log("Response:", e?.response?.data);
        console.log("Request Payload:", data);

        const errorMessage =
          e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Failed to create product";

        updateStep("create-product", {
          status: "error",
          details: JSON.stringify(errorMessage),
        });

        toast.error(
          typeof errorMessage === "string"
            ? errorMessage
            : JSON.stringify(errorMessage)
        );

        isCriticalFailureRef.current = true;
        isSavingRef.current = false;

        return;
      }
    // ── Step 2: Upload images ───────────────────────────────────────────────────
    if (imgCount > 0) {
      updateStep('upload-images', { status: 'loading' })
      let imgSucceeded = 0
      let imgFailed    = 0

      for (let i = 0; i < localImages.length; i++) {
        const img       = localImages[i]
        const imageType = i === 0 ? 'thumbnail' : 'gallery'
        try {
          // BUG-2 FIX: pass img.file (raw File) — api.js builds FormData internally
          await customProductsAPI.uploadImage(createdProduct.id, img.file, imageType, i === 0)
          imgSucceeded++
        } catch (_) {
          imgFailed++
        }
      }

      if (imgFailed === 0) {
        updateStep('upload-images', {
          status: 'done',
          details: `${imgSucceeded} uploaded`
        })
      } else {
        hadPartialFailure = true

        updateStep('upload-images', {
          status: imgSucceeded > 0 ? 'done' : 'error',
          details: `${imgSucceeded} uploaded, ${imgFailed} failed`,
        })

        toast.error(
          `${imgFailed} image upload failed`
        )
      }
    }

    // // ── Step 3: Create variants ─────────────────────────────────────────────────
    // if (varCount > 0) {
    //   updateStep('create-variants', { status: 'loading' })
    //   try {
    //     // BUG-3 FIX: wrap array in { variants: [...] } — matches BulkVariantCreate schema
    //     const variantsPayload = localVariants.map(({ _localId, ...v }) => v)
    //     const bulkRes = await productsApi.bulkCreateVariants(createdProduct.id, { variants: variantsPayload })

    //     // BUG-4 FIX: response is ProductResponse, not { total_created, total_failed }.
    //     // Derive success count from the returned product's variants array.
    //     const returnedProduct = bulkRes.data
    //     const varSucceeded    = (returnedProduct?.variants || []).length
    //     const varFailed       = varCount - varSucceeded

    //     if (varFailed <= 0) {
    //       updateStep('create-variants', { status: 'done', details: `${varSucceeded} created` })
    //     } else {
    //       hadPartialFailure = true
    //       updateStep('create-variants', {
    //         status:  varSucceeded > 0 ? 'done' : 'error',
    //         details: `${varSucceeded} created, ${varFailed} failed`,
    //       })
    //       toast.error(`${varFailed} variant${varFailed > 1 ? 's' : ''} failed — add them later via Edit`)
    //     }
    //   } catch (e) {
    //     hadPartialFailure = true
    //     updateStep('create-variants', {
    //       status:  'error',
    //       details: e.response?.data?.detail || 'Variant creation failed',
    //     })
    //     toast.error('Variant creation failed — add them later via Edit')
    //   }
    // }

    // ── Finish ──────────────────────────────────────────────────────────────────
    revokeObjectURLs(localImages)
    await new Promise(r => setTimeout(r, hadPartialFailure ? 1500 : 800))

    if (!hadPartialFailure) {
      toast.success(overrideStatus === 'published' ? 'Product published successfully.' : 'Product created successfully.')
      qc.invalidateQueries({queryKey: ['custom-products']})
      setSaveSteps(null)
      isSavingRef.current = false
      onClose()
    } else {
      qc.invalidateQueries({queryKey: ['custom-products']})
      isSavingRef.current = false
    }
  }

  const handleOverlayClose = useCallback(() => {
    setSaveSteps(null)
    if (!isCriticalFailureRef.current) {
      onClose()
    }
    isCriticalFailureRef.current = false
  }, [onClose])

  // ─── Local image handlers (new product only) ──────────────────────────────────

  const pickLocalImage = useCallback((f) => {
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type))  { toast.error('Only JPG, PNG, WebP allowed'); return }
    if (f.size > MAX_FILE_SIZE)           { toast.error('File must be under 5 MB');      return }
    setLocalImages(prev => {
      if (prev.length >= MAX_IMAGES)     { toast.error(`Maximum ${MAX_IMAGES} images`); return prev }
      if (isDuplicateFile(f, prev))      { toast.error('This image is already added');  return prev }
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

  // const addLocalVariant    = useCallback(v => setLocalVariants(prev => [...prev, v]), [])
  // const removeLocalVariant = useCallback(id => setLocalVariants(prev => prev.filter(v => v._localId !== id)), [])

  // ─── Derived values ───────────────────────────────────────────────────────────

  const thumbnailUrl  = isEdit ? getImageUrl(product?.thumbnail) : (localImages[0]?.previewUrl || null)
  // const variants      = isEdit ? (product?.variants || []) : localVariants
  const isBatchSaving = saveSteps !== null

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {isBatchSaving && <SaveProgressOverlay steps={saveSteps} onClose={handleOverlayClose} />}

      {/* HEAD: card wrapper + shadow; branch: bg-app — merged both */}
      <div className="card overflow-hidden mt-6 shadow-md bg-app">
        <form
          className="flex flex-col"
          onSubmit={e => {
            e.preventDefault()
            if (isSavingRef.current || editMutation.isPending || editPubMutation.isPending) return
            if (isEdit) editMutation.mutate(payload())
            else batchSave()
          }}>

          {/* Branch: sticky header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-1 bg-app border-b border-app backdrop-blur-sm">
            <h3 className="text-sm font-bold text-app p-4 uppercase tracking-tight">
              {isEdit ? `Editing: ${product.title}` : 'Add New Product'}
            </h3>
            <Button type="button" onClick={handleClose} disabled={isBatchSaving} aria-label="Close form"
              variant="delete" size="sm"
              className="h-8 w-8 p-0 rounded-md text-muted hover:text-app hover:bg-red-500 hover:border hover:border-red-500">
              <X size={16} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 p-4 sm:p-6">

            {/* ── LEFT: image panel ── */}
            <div className="flex flex-col items-center gap-3.5">
              {isEdit ? (
                <>
                  <div
                    className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-none h-40 sm:h-52 md:aspect-square border-2 border-dashed border-brand-500/50 hover:border-brand-500 rounded-2xl bg-app overflow-hidden cursor-pointer flex items-center justify-center transition-all hover:scale-[1.01] mx-auto"
                    onClick={() => onOpenImage(product)}
                    title="Click to manage images"
                  >
                    {thumbnailUrl
                      ? <img src={thumbnailUrl} alt={form.title} className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center gap-1.5 text-muted">
                          <Camera size={32} className="text-muted opacity-40" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Add Image</span>
                        </div>
                    }
                  </div>
                  <Button type="button" onClick={() => onOpenImage(product)} variant="secondary" icon={Plus} className="w-full">
                    {product.thumbnail ? 'Change Image' : 'Add Image'}
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="w-full max-w-[250px] mx-auto h-40 sm:h-auto sm:aspect-square border-2 border-dashed border-gray-500/50 hover:border-brand-500 rounded-2xl bg-app overflow-hidden cursor-pointer flex items-center justify-center"
                    onClick={() => localFileRef.current?.click()}
                    title="Click to add image"
                  >
                    {localImages.length > 0
                      ? <img src={localImages[0].previewUrl} alt="preview" className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center gap-1.5 text-muted">
                          <Camera size={32} className="text-muted opacity-40" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Click to add</span>
                        </div>
                    }
                  </div>
                  <input ref={localFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e => pickLocalImage(e.target.files[0])} />
                  {localImages.length > 1 && (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {localImages.slice(1).map(img => (
                        <div key={img.id} className="relative w-8 h-9 rounded overflow-hidden border border-app">
                          <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                          <Button type="button" onClick={() => removeLocalImage(img.id)}
                            aria-label="Remove image"
                            variant="ghost"
                            size="sm"
                            className="absolute inset-0 h-full w-full p-0 rounded-none bg-black/50 opacity-0 hover:opacity-100">
                            <X size={10} className="text-white" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button type="button" onClick={() => localFileRef.current?.click()} variant="secondary" icon={Plus} className="w-full">
                    {localImages.length > 0 ? 'Add More' : 'Add Image'}
                  </Button>
                  {localImages.length > 0 && (
                    <Button type="button" onClick={() => removeLocalImage(localImages[0].id)}
                      variant="ghost" size="sm" icon={X} className="mt-1.5 p-0 text-[10px] text-red-500 hover:text-red-600 hover:bg-transparent">
                      Remove
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* ── RIGHT: fields ── */}
            <div className="flex flex-col gap-4">

              {/* Product Name */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label htmlFor="product-title" className="text-xs font-bold text-muted">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input id="product-title" className="input-field py-2.5 text-xs"
                  value={form.title} onChange={e => set('title', e.target.value)}
                  required minLength={2} placeholder="e.g. Classic Black Tee" />
                </div>

              {/* Code / SKU (read-only) */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">Code / SKU</label>
                <input className="input-field py-2.5 text-xs opacity-60 cursor-not-allowed bg-app" readOnly
                  value=""
                  placeholder={isEdit ? 'auto-generated on first variant' : 'set via variant'} />
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">Category</label>
                <select className="input-field py-2.5 text-xs"
                  value={form.custom_category_id}
                  onChange={e => { set('custom_category_id', e.target.value); set('collection_id', '') }}>
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

             

              {/* Price Range */}

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-xs font-bold text-muted">
                    Original Min Price
                  </label>

                  <input
                    type="number"
                    className="input-field py-2.5 text-xs"
                    value={form.original_price_min}
                    onChange={(e) =>
                      set('original_price_min', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted">
                    Original Max Price
                  </label>

                  <input
                    type="number"
                    className="input-field py-2.5 text-xs"
                    value={form.original_price_max}
                    onChange={(e) =>
                      set('original_price_max', e.target.value)
                    }
                  />
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-xs font-bold text-muted">
                    Selling Min Price
                  </label>

                  <input
                    type="number"
                    className="input-field py-2.5 text-xs"
                    value={form.selling_price_min}
                    onChange={(e) =>
                      set('selling_price_min', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted">
                    Selling Max Price
                  </label>

                  <input
                    type="number"
                    className="input-field py-2.5 text-xs"
                    value={form.selling_price_max}
                    onChange={(e) =>
                      set('selling_price_max', e.target.value)
                    }
                  />
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-xs font-bold text-muted">
                    Stock Quantity
                  </label>

                  <input
                    type="number"
                    className="input-field py-2.5 text-xs"
                    value={form.stock_quantity}
                    onChange={(e) =>
                      set('stock_quantity', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted">
                    Size
                  </label>

                  <input
                    className="input-field py-2.5 text-xs"
                    value={form.size}
                    onChange={(e) =>
                      set('size', e.target.value)
                    }
                    placeholder="All Size"
                  />
                </div>

              </div>

              {/* Status + Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                  <label className="text-xs font-bold text-muted">Status</label>
                  <select className="input-field py-2.5 text-xs"
                    value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                  <label className="text-xs font-bold text-muted">Tags</label>
                  <input className="input-field py-2.5 text-xs"
                    value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Black, White…" />
                </div>
              </div>

              {/* Short Description */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-start">
                <label className="text-xs font-bold text-muted pt-2">Short Desc</label>
                <textarea rows={2} className="input-field py-2.5 text-xs resize-none"
                  value={form.short_description} onChange={e => set('short_description', e.target.value)}
                  placeholder="One-liner for product cards…" maxLength={500} />
              </div>

              {/* Merchandising flags */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">Flags</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'is_featured',    label: '⭐ Featured'    },
                    { key: 'is_trending',    label: '🔥 Trending'    },
                    { key: 'is_best_seller', label: '⚡ Best Seller' },
                    { key: 'is_new_arrival', label: '🆕 New Arrival' },
                  ].map(f => (
                    <label key={f.key} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={!!form[f.key]}
                        onChange={e => set(f.key, e.target.checked)}
                        className="w-3.5 h-3.5 accent-brand-500" />
                      <span className="text-xs font-medium text-muted">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ── Variants section ──
          <div className="px-6 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Variants</p>
            {variants.length > 0 ? (
              <div className="card overflow-hidden bg-surface text-xs">
                <Table>
                  <TableHeader>
                    <TableRow hover={false}>
                      <TableHead>Size</TableHead>
                      <TableHead>Actual Price</TableHead>
                      <TableHead>Discount Price</TableHead>
                      <TableHead>% off</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map(v => (
                      <TableRow key={isEdit ? v.id : v._localId}>
                        {/* HEAD: Badge component — cleaner than branch's oversized text-xl cell */}
                        {/* <TableCell><Badge label={v.size} variant="info" /></TableCell>
                        <TableCell className="font-medium">{formatPrice(v.original_price)}</TableCell>
                        <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">{formatPrice(v.selling_price)}</TableCell>
                        <TableCell className="font-medium text-amber-600">
                          {v.discount_percentage ? `${parseFloat(v.discount_percentage).toFixed(0)}%` : '—'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {isEdit ? <StockBadge stock={v.stock_quantity} /> : <span>{v.stock_quantity}</span>}
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <button
                              type="button"
                              className="rounded-md flex items-center justify-center border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white"
                              style={{ width: 24, height: 24 }}
                              disabled={deletingVariantIds.has(v.id)}
                              onClick={() => deleteVariantMutation.mutate(v.id)}
                              aria-label="Delete variant">
                              {deletingVariantIds.has(v.id)
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Trash2 size={12} />}
                            </button>
                          ) : (
                            <button type="button"
                              className="btn-secondary rounded-lg flex items-center justify-center border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white"
                              style={{ width: 24, height: 24 }}
                              onClick={() => removeLocalVariant(v._localId)}
                              aria-label="Remove variant">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs border p-2 rounded-md text-muted py-1.5 mb-2">No variants yet.</p>
            )}

            {isEdit ? (
              <Button
                type="button"
                onClick={() => onOpenVariant(product)}
                variant="addvariant"
                className="min-w-[100px] mt-2 whitespace-nowrap hover:bg-sky-400 hover:border-sky-600"
              >
                Add Variant
              </Button>
            ) : (
              <LocalVariantForm onAdd={addLocalVariant} existingVariants={localVariants} />
            )}
          </div> */} 

          {/* ── Description ── */}
          <div className="px-6 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Description</p>
            <textarea className="input-field text-xs py-2.5 resize-none h-28 w-full" rows={3}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Product description…" />
          </div>

          {/* Ready badges */}
          {!isEdit && localImages.length > 0 && (
            <div className="mx-6 mt-3 flex flex-wrap gap-2">
              {localImages.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full px-2.5 py-1 font-semibold">
                  <ImageIcon size={10} /> {localImages.length} image{localImages.length > 1 ? 's' : ''} ready
                </span>
              )}
              {/* {localVariants.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-2.5 py-1 font-semibold">
                  <Layers size={10} /> {localVariants.length} variant{localVariants.length > 1 ? 's' : ''} ready
                </span>
              )} */}
            </div>
          )}

          {/* ── Action buttons — branch color scheme (emerald Save, sky Publish) +
                HEAD's border-t border-app mt-6 container ── */}
          <div className="grid gap-3 p-6 border-t border-app mt-6">
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 btn-primary rounded-lg bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 py-2.5 text-xs font-bold"
                disabled={isBatchSaving || editMutation.isPending}>
                {(isBatchSaving || editMutation.isPending)
                  ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                  : 'Save'}
              </button>
              <button
                type="button"
                className="flex-1 btn-primary rounded-lg bg-sky-400 hover:bg-sky-500 border-sky-500 hover:border-sky-600 py-2.5 text-xs font-bold"
                disabled={isBatchSaving || editPubMutation.isPending}
                onClick={() => {
                  if (isSavingRef.current || editPubMutation.isPending) return
                  if (isEdit) editPubMutation.mutate(payload())
                  else batchSave('published')
                }}>
                {(isBatchSaving || editPubMutation.isPending)
                  ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                  : 'Publish'}
              </button>
            </div>
            <button type="button"
              className="w-full px-4 py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white font-bold text-xs transition-colors"
              onClick={handleClose} disabled={isBatchSaving}>
              Cancel
            </button>
          </div>

        </form>
      </div>
    </>
  )
}