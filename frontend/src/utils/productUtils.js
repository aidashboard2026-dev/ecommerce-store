import { useState, useEffect } from 'react'

// ─── Image URL helper ─────────────────────────────────────────────────────────
//
// Images are stored in the DB as root-relative paths: /uploads/products/<filename>
// The backend serves them at: http://backend:8000/uploads/products/<filename>
//
// VITE_BACKEND_URL env var controls how the frontend resolves these paths:
//   - In Docker dev (Vite running on :5173):
//       VITE_BACKEND_URL is NOT set (or '')
//       → image src = '/uploads/products/…'
//       → Vite dev server proxies /uploads → http://backend:8000  (vite.config.js)
//       → This works transparently.
//   - In production (frontend + backend on different origins):
//       Set VITE_BACKEND_URL=https://api.mystore.com in .env
//       → image src = 'https://api.mystore.com/uploads/products/…'
//       → Direct request to the backend origin. No proxy needed.
//
// NOTE: Do NOT derive BACKEND_URL by stripping /api/v1 from VITE_API_URL —
// that breaks when VITE_API_URL is a relative path (the common dev setup).
const _BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')

export function getImageUrl(thumbnail) {
  if (!thumbnail) return null
  // Already an absolute URL — return as-is (handles legacy absolute URLs in DB)
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) return thumbnail
  // Root-relative path from DB (e.g. /uploads/products/1_abc.png)
  if (thumbnail.startsWith('/')) return `${_BACKEND_ORIGIN}${thumbnail}`
  // Bare filename or relative path — prefix with the products upload path
  return `${_BACKEND_ORIGIN}/uploads/products/${thumbnail}`
}


/** Revoke all blob object URLs in an array of { previewUrl } items */
export function revokeObjectURLs(items) {
  if (!items || !items.length) return
  items.forEach(item => {
    if (item?.previewUrl) {
      try { URL.revokeObjectURL(item.previewUrl) } catch (_) { /* noop */ }
    }
  })
}

/** Generate a stable temporary ID for local-only items */
export function genLocalId() {
  return crypto.randomUUID()
}

/** Returns true if `file` is already represented in `existingItems` */
export function isDuplicateFile(file, existingItems) {
  return existingItems.some(item =>
    item.file.name === file.name &&
    item.file.size === file.size &&
    item.file.lastModified === file.lastModified
  )
}

/** Format a numeric price as ₹1,234.56 */
export function formatPrice(value) {
  if (value == null) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Debounce a value — returns the debounced value after `delay` ms of silence */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}