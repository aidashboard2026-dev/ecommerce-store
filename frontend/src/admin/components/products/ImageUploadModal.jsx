import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, X, Trash2, AlertTriangle, Package,
  Loader2, ImagePlus, LayoutGrid,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/shared/components/ui/Modal'
import { productsAPI as productsApi } from '@/shared/services/api'
import { getImageUrl } from '@/shared/utils/productUtils'
import useBusinessLimits from '@/shared/hooks/useBusinessLimits'

/**
 * Contract required of any `api` prop passed to ImageUploadModal.
 * Both productsAPI and any future entity-specific API module (e.g.
 * customProductsAPI) MUST implement this shape. Enforced only by
 * convention/JSDoc today — if this codebase moves to TypeScript, promote
 * this to a real interface.
 *
 * @typedef {Object} ImageUploadAPI
 * @property {(entityId: number|string, file: File, imageType: string) => Promise<any>} uploadImage
 * @property {(entityId: number|string, imageType: string) => Promise<any>} deleteImage
 * @property {(entityId: number|string, index: number) => Promise<any>} deleteGalleryImage
 */

const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_ACCEPT = 'image/jpeg,image/png,image/webp'

// ─── Gallery-specific rules ────────────────────────────────────────────────────
// Gallery images follow a dedicated, fixed business rule (max 4 images, max
// 4 MB per image) that is independent of the dynamic per-store business
// limits used by the other single-image slots (thumbnail/front/back/size
// chart). Keeping these as standalone constants avoids coupling the fixed
// product requirement to configuration that may change per store.
const GALLERY_MAX_IMAGES            = 4
const GALLERY_MAX_FILE_SIZE_BYTES   = 4 * 1024 * 1024 // 4 MB
const GALLERY_MAX_FILE_SIZE_LABEL   = '4 MB'
const GALLERY_ALLOWED_FORMATS_LABEL = 'JPG, PNG, WEBP'

// ─── Tab configuration ────────────────────────────────────────────────────────

const IMAGE_TABS = [
  { key: 'thumbnail',  label: 'Thumbnail',  field: 'thumbnail',        description: 'Primary image shown in all product cards and listings.' },
  { key: 'front',      label: 'Front',      field: 'image_front',      description: 'Front view of the product.' },
  { key: 'back',       label: 'Back',       field: 'image_back',       description: 'Back view of the product.' },
  { key: 'size_chart', label: 'Size Chart', field: 'image_size_chart', description: 'Size guide image shown on the product detail page.' },
  { key: 'gallery',    label: 'Gallery',    field: 'gallery_images',   description: 'Additional product images. Shown in image carousel.' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Renders a titled, multi-line toast using the app's existing react-hot-toast
 * setup. Centralising this avoids duplicating the same title/message JSX
 * across every validation branch.
 */
function showActionToast(kind, title, message) {
  const emit = kind === 'success' ? toast.success : toast.error
  emit(
    <div>
      <strong style={{ display: 'block', marginBottom: '4px' }}>{title}</strong>
      <div style={{ whiteSpace: 'pre-line', fontSize: '12px', lineHeight: '1.4' }}>{message}</div>
    </div>
  )
}

/**
 * Splits a batch of user-selected files for the gallery into:
 *  - filesToUpload: valid files that still fit within the remaining slots
 *  - hasUnsupportedType / hasOversized: flags for the corresponding toasts
 *  - remainingSlots / overflowCount: used to compose the "limit reached" copy
 *
 * Pure function — no side effects — so it stays easy to unit test and reuse.
 */
function validateGalleryFiles(files, existingCount) {
  const remainingSlots = Math.max(0, GALLERY_MAX_IMAGES - existingCount)
  const valid = []
  let hasUnsupportedType = false
  let hasOversized = false

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      hasUnsupportedType = true
      continue
    }
    if (file.size > GALLERY_MAX_FILE_SIZE_BYTES) {
      hasOversized = true
      continue
    }
    valid.push(file)
  }

  const filesToUpload = valid.slice(0, remainingSlots)
  const overflowCount = valid.length - filesToUpload.length

  return { filesToUpload, hasUnsupportedType, hasOversized, remainingSlots, overflowCount }
}

// ─── Single image slot (thumbnail / front / back / size_chart) ────────────────

function SingleImageSlot({ label, imageUrl, onDelete, isPending }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const timerRef = useRef(null)
  const resolved = getImageUrl(imageUrl)

  useEffect(() => {
    if (confirmDelete) {
      timerRef.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
    return () => clearTimeout(timerRef.current)
  }, [confirmDelete])

  if (!resolved) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-app bg-surface/40">
        <div className="text-center">
          <Package size={18} className="mx-auto mb-1 text-muted opacity-50" />
          <p className="text-xs text-muted">No {label.toLowerCase()} image yet</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Current {label}</p>
      <div className="relative group w-full rounded-xl overflow-hidden border border-app bg-surface/40" style={{ maxHeight: 220 }}>
        <img src={resolved} alt={label} className="w-full object-contain" style={{ maxHeight: 220 }} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} disabled={isPending}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Trash2 size={12} /> Remove
            </button>
          ) : (
            <button onClick={() => { setConfirmDelete(false); onDelete() }} disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
              {isPending ? 'Removing…' : 'Confirm remove'}
            </button>
          )}
        </div>
        <span className="absolute top-2 left-2 bg-brand-500 text-white text-[9px] rounded px-1.5 py-0.5 font-semibold uppercase">
          {label}
        </span>
      </div>
    </div>
  )
}

// ─── Gallery grid ─────────────────────────────────────────────────────────────

function GalleryGrid({ images = [], onDelete, deletingIndex }) {
  if (!images.length) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-app bg-surface/40">
        <div className="text-center">
          <LayoutGrid size={18} className="mx-auto mb-1 text-muted opacity-50" />
          <p className="text-xs text-muted">No gallery images yet</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((url, idx) => (
          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-app bg-surface">
            <img src={getImageUrl(url) || url} alt={`Gallery ${idx + 1}`}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
              <button onClick={() => onDelete(idx)} disabled={deletingIndex === idx}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded-lg p-1.5">
                {deletingIndex === idx
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Trash2 size={12} />}
              </button>
            </div>
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] rounded px-1">
              {idx + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Gallery heading + live counter ────────────────────────────────────────────
// Shows "Gallery Images" with a "n/4 Images" badge that re-renders whenever
// `count` changes (add or remove), plus the file-size/format info line.

function GalleryImagesHeader({ count, max }) {
  const isFull = count >= max
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-sm font-semibold text-app flex items-center gap-1.5">
          <LayoutGrid size={14} className="text-brand-500" />
          Gallery Images
        </h4>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap
            ${isFull ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}
        >
          {count}/{max} Images
        </span>
      </div>
      <p className="text-xs text-muted">Maximum file size: {GALLERY_MAX_FILE_SIZE_LABEL}</p>
      <p className="text-xs text-muted">Supported formats: {GALLERY_ALLOWED_FORMATS_LABEL}</p>
    </div>
  )
}

// ─── Gallery drop zone (multi-file, auto-upload) ───────────────────────────────
// Unlike the single-image DropZone below, gallery selection can include
// multiple files at once and uploads immediately (there is nothing to
// "replace", only slots to fill), so it owns its own file input/ref instead
// of sharing state with the single-image flow.

function GalleryDropZone({ onFilesSelected, disabled, uploading, remainingSlots, progress }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (fileList) => {
    if (disabled || !fileList || fileList.length === 0) return
    onFilesSelected(fileList)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div
      onClick={() => { if (disabled) return; fileRef.current?.click() }}
      onDragOver={e => { e.preventDefault(); if (disabled) return; setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (disabled) return; handleFiles(e.dataTransfer.files) }}
      title={disabled ? (uploading ? 'Upload in progress…' : 'Maximum gallery limit reached.\nRemove an image to add another.') : ''}
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-400 bg-gray-100/10' : dragging ? 'border-brand-500 bg-brand-500/5 cursor-pointer' : 'border-app hover:border-brand-400 hover:bg-surface/50 cursor-pointer'}`}
    >
      {uploading ? (
        <>
          <Loader2 size={24} className="mx-auto mb-2 text-brand-500 animate-spin" />
          <p className="text-sm text-muted">
            {progress?.total > 1
              ? `Uploading image ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
              : 'Uploading…'}
          </p>
        </>
      ) : (
        <>
          <ImagePlus size={24} className="mx-auto mb-2 text-muted" />
          <p className="text-sm text-muted">
            Drop gallery images here or <span className="text-brand-500">browse</span>
          </p>
          <p className="text-xs text-muted mt-1">
            {remainingSlots > 0
              ? `You can add up to ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}`
              : 'Gallery limit reached'}
          </p>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_ACCEPT}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ─── Drop zone (shared, single-image slots) ────────────────────────────────────

function DropZone({ preview, onFile, fileRef, label, disabled }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onClick={() => { if (disabled) return; fileRef.current?.click() }}
      onDragOver={e => { e.preventDefault(); if (disabled) return; setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (disabled) return; onFile(e.dataTransfer.files[0]) }}
      title={disabled ? "Maximum limit reached.\nDelete an existing item to continue." : ""}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-400 bg-gray-100/10' : dragging ? 'border-brand-500 bg-brand-500/5' : 'border-app hover:border-brand-400 hover:bg-surface/50'}`}
    >
      {preview ? (
        <img src={preview} alt="preview" className="mx-auto max-h-32 rounded-lg object-contain" />
      ) : (
        <>
          <Upload size={24} className="mx-auto mb-2 text-muted" />
          <p className="text-sm text-muted">Drop {label} image here or <span className="text-brand-500">browse</span></p>
          <p className="text-xs text-muted mt-1">JPG, PNG, WebP · max 10 MB</p>
        </>
      )}
      <input ref={fileRef} type="file" accept={ALLOWED_ACCEPT} className="hidden" disabled={disabled}
        onChange={e => { if (disabled) return; onFile(e.target.files[0]) }} />
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} props.product - the entity being edited (must expose `id` plus the image fields in IMAGE_TABS)
 * @param {ImageUploadAPI} [props.api=productsApi] - injected API module; defaults preserve original Products-only behaviour
 * @param {string} [props.queryKeyPrefix='products'] - React Query list-key prefix to invalidate after mutations
 * @param {string} [props.detailQueryKey='product'] - React Query detail-key to invalidate after mutations
 */
export default function ImageUploadModal({
  isOpen, onClose, product,
  api = productsApi,
  queryKeyPrefix = 'products',
  detailQueryKey = 'product',
  onUploadLocal,
  onDeleteLocal,
}) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits()

  const [activeTab, setActiveTab] = useState('thumbnail')
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState(null)
  const [deletingIndex, setDeletingIndex] = useState(null)

  const isLocalFlow = product && (product.id === null || product.id === undefined)

  // Reset when modal closes or product changes
  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      clearPreview()
    }
  }, [isOpen])

  useEffect(() => {
    setActiveTab('thumbnail')
    setFile(null)
    clearPreview()
  }, [product?.id])

  function clearPreview() {
    setPreview(prev => {
      if (prev) { try { URL.revokeObjectURL(prev) } catch (e) { void e } }
      return null
    })
  }

  const pickFile = useCallback((f) => {
    if (!f) return
    if (!limits) {
      toast.error('Store limits not loaded yet. Please wait.')
      return
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error('Only JPG, PNG, WebP allowed.')
      return
    }
    if (f.size > limits.max_image_size) {
      toast.error(`File must be under ${limits.max_image_size / (1024 * 1024)} MB.`)
      return
    }
    clearPreview()
    setFile(f)
    setPreview(URL.createObjectURL(f))
    if (fileRef.current) fileRef.current.value = ''
  }, [limits])

  const clearSelection = () => {
    clearPreview()
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Cache invalidation ────────────────────────────────────────────────────────
  // React Query prefix-matches queryKey arrays, so invalidating [queryKeyPrefix]
  // already covers [queryKeyPrefix, product.id] — invalidating both separately
  // is redundant. We invalidate the list prefix and the distinct detail-key
  // namespace (e.g. storefront's ['product', slug] vs admin's ['products']),
  // matching the two-namespace cache-busting rule established in ProductsPage.
  const invalidateEntityQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: [queryKeyPrefix] })
    qc.invalidateQueries({ queryKey: [detailQueryKey] })
  }, [qc, queryKeyPrefix, detailQueryKey])

  // ── Upload mutation ──────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: () => api.uploadImage(product.id, file, activeTab),
    onSuccess: () => {
      toast.success(`${IMAGE_TABS.find(t => t.key === activeTab)?.label || 'Image'} uploaded successfully.`)
      invalidateEntityQueries()
      clearSelection()
    },
    onError: e => toast.error(e.response?.data?.detail || 'Upload failed'),
  })

  // ── Delete single image mutation ──────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteImage(product.id, activeTab),
    onSuccess: () => {
      toast.success('Image removed successfully.')
      invalidateEntityQueries()
    },
    onError: () => toast.error('Failed to remove image'),
  })

  // ── Delete gallery image mutation ─────────────────────────────────────────────

  const deleteGalleryMutation = useMutation({
    mutationFn: (index) => api.deleteGalleryImage(product.id, index),
    onMutate:  (index) => setDeletingIndex(index),
    onSettled: ()      => setDeletingIndex(null),
    onSuccess: () => {
      toast.success('Gallery image removed successfully.')
      invalidateEntityQueries()
    },
    onError: () => toast.error('Failed to remove gallery image'),
  })

  // ── Gallery batch upload mutation ─────────────────────────────────────────────
  // The upload endpoint only accepts one file per request (existing
  // architecture, unchanged), so a multi-file selection is uploaded
  // sequentially. The cache is invalidated after every individual file so the
  // grid + "n/4 Images" counter update immediately as each upload lands,
  // instead of waiting for the whole batch to finish.

  const [galleryProgress, setGalleryProgress] = useState({ done: 0, total: 0 })

  const galleryUploadMutation = useMutation({
    mutationFn: async (files) => {
      setGalleryProgress({ done: 0, total: files.length })
      let succeeded = 0
      let failed = 0

      for (const galleryFile of files) {
        try {
          await api.uploadImage(product.id, galleryFile, 'gallery')
          succeeded += 1
        } catch (err) {
          // Never surface raw backend/network errors to the user — log
          // internally and let the aggregated toast below handle messaging.
          console.error('Gallery image upload failed:', err)
          failed += 1
        } finally {
          setGalleryProgress(prev => ({ ...prev, done: prev.done + 1 }))
          // Refresh after each file so the UI reflects partial progress
          // ("2/4" -> "3/4" -> "4/4") rather than jumping at the very end.
          await qc.invalidateQueries({ queryKey: [queryKeyPrefix] })
          await qc.invalidateQueries({ queryKey: [detailQueryKey] })
        }
      }

      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      if (succeeded > 0) {
        toast.success(`${succeeded} gallery image${succeeded === 1 ? '' : 's'} uploaded successfully.`)
      }
      if (failed > 0) {
        showActionToast('error', 'Upload Failed', 'Unable to upload the image. Please try again.')
      }
    },
    onSettled: () => {
      setGalleryProgress({ done: 0, total: 0 })
    },
  })

  const isGalleryUploading = galleryUploadMutation.isPending

  const handleGalleryFilesSelected = useCallback((fileList) => {
    if (isGalleryUploading) return // prevent duplicate/overlapping uploads

    const files = Array.from(fileList)
    const existingCount = product?.gallery_images?.length || 0

    // Already at the cap — nothing selected can be accepted.
    if (existingCount >= GALLERY_MAX_IMAGES) {
      showActionToast(
        'error',
        'Image Limit Reached',
        'You can upload a maximum of 4 gallery images.\nPlease remove an existing image before adding another.'
      )
      return
    }

    const { filesToUpload, hasUnsupportedType, hasOversized, remainingSlots, overflowCount } =
      validateGalleryFiles(files, existingCount)

    if (hasUnsupportedType) {
      showActionToast('error', 'Unsupported File', 'Please upload JPG, PNG, or WEBP images only.')
    }
    if (hasOversized) {
      showActionToast('error', 'Image Too Large', 'Please upload an image smaller than 4 MB.')
    }
    if (overflowCount > 0) {
      showActionToast(
        'error',
        'Image Limit Reached',
        `Only ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} can be added.\nMaximum gallery limit is 4 images.`
      )
    }

    if (filesToUpload.length === 0) return

    if (isLocalFlow && onUploadLocal) {
      onUploadLocal('gallery', filesToUpload)
      toast.success(`${filesToUpload.length} gallery image${filesToUpload.length === 1 ? '' : 's'} staged successfully.`)
    } else {
      galleryUploadMutation.mutate(filesToUpload)
    }
  }, [isGalleryUploading, product?.gallery_images, galleryUploadMutation, isLocalFlow, onUploadLocal])

  // ── Current image for the active tab ─────────────────────────────────────────

  const currentTab = IMAGE_TABS.find(t => t.key === activeTab)
  const currentImageUrl = product?.[currentTab?.field]
  const galleryImages   = product?.gallery_images || []

  const isGallery = activeTab === 'gallery'

  // Gallery uses its own fixed 4-image cap, independent of the dynamic
  // per-store business limits used by the single-image slots above.
  const galleryRemainingSlots = Math.max(0, GALLERY_MAX_IMAGES - galleryImages.length)
  const isGalleryFull = galleryImages.length >= GALLERY_MAX_IMAGES

  const currentCount = product
    ? (product.thumbnail ? 1 : 0) +
      (product.image_front ? 1 : 0) +
      (product.image_back ? 1 : 0) +
      (product.image_size_chart ? 1 : 0) +
      (product.gallery_images || []).length
    : 0

  const willIncrease = activeTab === 'gallery' ? true : (currentTab?.field ? !product?.[currentTab.field] : false)
  const isLimitReached = limits ? currentCount >= limits.max_product_images && willIncrease : true

  const handleUploadClick = () => {
    if (!file) return
    if (!limits) {
      toast.error('Store limits not loaded yet. Please wait.')
      return
    }
    if (isLimitReached) {
      toast.error(
        <div>
          <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
          <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
            You have reached the maximum allowed limit of {limits.max_product_images} images for this product.{"\n"}Please delete an existing image before uploading another.
          </div>
        </div>
      )
      return
    }
    if (isLocalFlow && onUploadLocal) {
      onUploadLocal(activeTab, file)
      toast.success(`${IMAGE_TABS.find(t => t.key === activeTab)?.label || 'Image'} staged successfully.`)
      clearSelection()
    } else {
      uploadMutation.mutate()
    }
  }

  const uploadLabel = currentTab
    ? (currentImageUrl && !isGallery ? `Replace ${currentTab.label}` : `Upload ${currentTab.label}`)
    : 'Upload'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Images" size="lg">
      <div className="space-y-4">
        {limitsLoading && (
          <div className="flex items-center gap-2 justify-center py-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading store limits...</span>
          </div>
        )}
        {limitsError && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Unable to load store limits.</span>
            </div>
            <button
              type="button"
              onClick={() => refetchLimits()}
              className="px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-app">
          {IMAGE_TABS.map(tab => {
            const hasImage = tab.key === 'gallery'
              ? (galleryImages.length > 0)
              : !!product?.[tab.field]
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); clearSelection() }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap -mb-px
                  ${activeTab === tab.key
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-muted hover:text-app'
                  }`}
              >
                {tab.label}
                {hasImage && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab description / Gallery heading + live counter ── */}
        {isGallery ? (
          <GalleryImagesHeader count={galleryImages.length} max={GALLERY_MAX_IMAGES} />
        ) : (
          <p className="text-xs text-muted">{currentTab?.description}</p>
        )}

        {/* ── Current image(s) ── */}
        {isGallery ? (
          <GalleryGrid
            images={galleryImages}
            onDelete={idx => {
              if (isLocalFlow && onDeleteLocal) {
                onDeleteLocal('gallery', idx)
                toast.success('Gallery image removed.')
              } else {
                deleteGalleryMutation.mutate(idx)
              }
            }}
            deletingIndex={deletingIndex}
          />
        ) : (
          <SingleImageSlot
            label={currentTab?.label || ''}
            imageUrl={currentImageUrl}
            onDelete={() => {
              if (isLocalFlow && onDeleteLocal) {
                onDeleteLocal(activeTab)
                toast.success('Image removed.')
              } else {
                deleteMutation.mutate()
              }
            }}
            isPending={deleteMutation.isPending}
          />
        )}

        {/* ── Upload zone ── */}
        {isGallery ? (
          <GalleryDropZone
            onFilesSelected={handleGalleryFilesSelected}
            disabled={isGalleryFull || isGalleryUploading}
            uploading={isGalleryUploading}
            remainingSlots={galleryRemainingSlots}
            progress={galleryProgress}
          />
        ) : (
          (!isLimitReached || !willIncrease) && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                {currentImageUrl ? `Replace ${currentTab?.label}` : `Upload ${currentTab?.label}`}
              </p>
              <DropZone
                preview={preview}
                onFile={pickFile}
                fileRef={fileRef}
                label={currentTab?.label?.toLowerCase() || ''}
                disabled={isLimitReached}
              />
            </div>
          )
        )}

        {/* ── Clear selection (single-image tabs only — gallery uploads immediately) ── */}
        {!isGallery && file && (
          <button onClick={clearSelection} className="text-xs text-muted hover:text-app flex items-center gap-1">
            <X size={11} /> Clear selection
          </button>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onClose} className="btn-secondary sm:px-6">Done</button>
          {!isGallery && (
            <button
              onClick={handleUploadClick}
              disabled={!file || uploadMutation.isPending || isLimitReached}
              title={isLimitReached ? "Maximum limit reached.\nDelete an existing item to continue." : ""}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadMutation.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Upload size={14} />}
              {uploadMutation.isPending ? 'Uploading…' : uploadLabel}
            </button>
          )}
        </div>

      </div>
    </Modal>
  )
}