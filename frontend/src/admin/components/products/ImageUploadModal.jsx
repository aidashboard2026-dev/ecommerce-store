/**
 * ImageUploadModal.jsx
 * Extended image manager with tabbed support for:
 *   Thumbnail | Front | Back | Size Chart | Gallery
 *
 * Preserves all existing thumbnail upload/delete behaviour.
 * New image types use the updated productsAPI.uploadImage(productId, file, imageType).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, X, Trash2, AlertTriangle, Package,
  Loader2, Image, ImagePlus, LayoutGrid,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/shared/components/ui/Modal'
import { productsAPI as productsApi } from '@/shared/services/api'
import { getImageUrl } from '@/shared/utils/productUtils'
import useBusinessLimits from '@/shared/hooks/useBusinessLimits'

const MAX_FILE_SIZE    = 10 * 1024 * 1024
const ALLOWED_TYPES    = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_ACCEPT   = 'image/jpeg,image/png,image/webp'

// ─── Tab configuration ────────────────────────────────────────────────────────

const IMAGE_TABS = [
  { key: 'thumbnail',   label: 'Thumbnail',   field: 'thumbnail',        description: 'Primary image shown in all product cards and listings.' },
  { key: 'front',       label: 'Front',        field: 'image_front',      description: 'Front view of the product.' },
  { key: 'back',        label: 'Back',         field: 'image_back',       description: 'Back view of the product.' },
  { key: 'size_chart',  label: 'Size Chart',   field: 'image_size_chart', description: 'Size guide image shown on the product detail page.' },
  { key: 'gallery',     label: 'Gallery',      field: 'gallery_images',   description: 'Additional product images. Shown in image carousel.' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateFile(f) {
  if (!ALLOWED_TYPES.includes(f.type)) return 'Only JPG, PNG, WebP allowed.'
  if (f.size > MAX_FILE_SIZE) return `File must be under ${MAX_FILE_SIZE / (1024 * 1024)} MB.`
  return null
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
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        Gallery ({images.length})
      </p>
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

// ─── Drop zone (shared) ───────────────────────────────────────────────────────

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

export default function ImageUploadModal({ isOpen, onClose, product }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits()

  const [activeTab, setActiveTab] = useState('thumbnail')
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState(null)
  const [deletingIndex, setDeletingIndex] = useState(null)

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

  // ── Upload mutation ──────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: () => productsApi.uploadImage(product.id, file, activeTab),
    onSuccess: () => {
      toast.success(`${IMAGE_TABS.find(t => t.key === activeTab)?.label || 'Image'} uploaded successfully.`)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', product.id] })
      clearSelection()
      if (activeTab !== 'gallery') {
        // Stay open so user can upload other types
      }
    },
    onError: e => toast.error(e.response?.data?.detail || 'Upload failed'),
  })

  // ── Delete single image mutation ──────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.deleteImage(product.id, activeTab),
    onSuccess: () => {
      toast.success('Image removed successfully.')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', product.id] })
    },
    onError: () => toast.error('Failed to remove image'),
  })

  // ── Delete gallery image mutation ─────────────────────────────────────────────

  const deleteGalleryMutation = useMutation({
    mutationFn: (index) => productsApi.deleteGalleryImage(product.id, index),
    onMutate:  (index) => setDeletingIndex(index),
    onSettled: ()      => setDeletingIndex(null),
    onSuccess: () => {
      toast.success('Gallery image removed successfully.')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', product.id] })
    },
    onError: () => toast.error('Failed to remove gallery image'),
  })

  // ── Current image for the active tab ─────────────────────────────────────────

  const currentTab = IMAGE_TABS.find(t => t.key === activeTab)
  const currentImageUrl = product?.[currentTab?.field]
  const galleryImages   = product?.gallery_images || []

  const isGallery  = activeTab === 'gallery'
  const isThumbnail = activeTab === 'thumbnail'

  const currentCount = (product?.thumbnail ? 1 : 0) + 
                       (product?.image_front ? 1 : 0) + 
                       (product?.image_back ? 1 : 0) + 
                       (product?.image_size_chart ? 1 : 0) + 
                       (product?.gallery_images || []).length;

  const willIncrease = activeTab === 'gallery' ? true : (currentTab?.field ? !product?.[currentTab.field] : false);
  const isLimitReached = limits ? currentCount >= limits.max_product_images && willIncrease : true;

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
      );
      return
    }
    uploadMutation.mutate()
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

        {/* ── Tab description ── */}
        <p className="text-xs text-muted">{currentTab?.description}</p>

        {/* ── Current image(s) ── */}
        {isGallery ? (
          <GalleryGrid
            images={galleryImages}
            onDelete={idx => deleteGalleryMutation.mutate(idx)}
            deletingIndex={deletingIndex}
          />
        ) : (
          <SingleImageSlot
            label={currentTab?.label || ''}
            imageUrl={currentImageUrl}
            onDelete={() => deleteMutation.mutate()}
            isPending={deleteMutation.isPending}
          />
        )}

        {/* ── Upload zone ── */}
        {(!isLimitReached || !willIncrease) && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              {isGallery
                ? `Add Gallery Image (${galleryImages.length})`
                : currentImageUrl ? `Replace ${currentTab?.label}` : `Upload ${currentTab?.label}`
              }
            </p>
            <DropZone
              preview={preview}
              onFile={pickFile}
              fileRef={fileRef}
              label={currentTab?.label?.toLowerCase() || ''}
              disabled={isLimitReached}
            />
          </div>
        )}

        {/* ── Clear selection ── */}
        {file && (
          <button onClick={clearSelection} className="text-xs text-muted hover:text-app flex items-center gap-1">
            <X size={11} /> Clear selection
          </button>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onClose} className="btn-secondary sm:px-6">Done</button>
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
        </div>

      </div>
    </Modal>
  )
}