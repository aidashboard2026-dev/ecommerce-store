import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, Trash2, AlertTriangle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Spinner from '../common/Spinner'
import { productsAPI as productsApi } from '../../services/api'
import { getImageUrl } from '../../utils/productUtils'

const MAX_FILE_SIZE = 5 * 1024 * 1024

// ─── Current image panel (shown inside the modal) ─────────────────────────────

function CurrentImagePanel({ product, onDeleted }) {
  const qc = useQueryClient()
  const thumbnailUrl = getImageUrl(product?.thumbnail)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imgLoadError, setImgLoadError] = useState(false)
  const confirmRef = useRef(null)

  const deleteMutation = useMutation({
    // WARN: uses deleteProductImage (canonical name); deleteImage alias removed from api.js
    mutationFn: () => productsApi.deleteProductImage(product.id),
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
        {imgLoadError ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted p-4">Image not found</div>
        ) : (
          <img
            src={thumbnailUrl}
            alt={product?.title || ''}
            className="w-full object-contain"
            style={{ maxHeight: 200 }}
            onError={() => setImgLoadError(true)}
          />
        )}
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

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ImageUploadModal({ isOpen, onClose, product }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => { if (!isOpen) { setFile(null); setPreview(null) } }, [isOpen])

  useEffect(() => {
    return () => { if (preview) { try { URL.revokeObjectURL(preview) } catch (_) {} } }
  }, [preview])

  const handleImageDeleted = useCallback(() => { setFile(null); setPreview(null) }, [])

  const pickFile = f => {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast.error('Only JPG, PNG, WebP allowed'); return }
    if (f.size > MAX_FILE_SIZE) { toast.error(`File must be under ${MAX_FILE_SIZE / (1024 * 1024)} MB`); return }
    if (preview) { try { URL.revokeObjectURL(preview) } catch (_) {} }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    if (fileRef.current) fileRef.current.value = ''
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
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragging ? 'border-brand-500 bg-brand-500/5' : 'border-app hover:border-brand-400 hover:bg-surface/50'}`}
          >
            {preview ? (
              <img src={preview} alt="preview" className="mx-auto max-h-32 rounded-lg object-contain" />
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2 text-muted" />
                <p className="text-sm text-muted">Drop image here or <span className="text-brand-500">browse</span></p>
                <p className="text-xs text-muted mt-1">JPG, PNG, WebP · max 5 MB</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickFile(e.target.files[0])} />
          </div>
        </div>
        {file && (
          <button onClick={() => {
            if (preview) { try { URL.revokeObjectURL(preview) } catch (_) {} }
            setFile(null)
            setPreview(null)
            if (fileRef.current) fileRef.current.value = ''
          }} className="text-xs text-muted hover:text-app flex items-center gap-1">
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