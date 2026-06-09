import { useState, useEffect } from 'react'

// ─── Image URL helper ─────────────────────────────────────────────────────────
// Strip /api/v1 suffix to get bare origin, then prepend to relative /uploads/… paths.
const _API_BASE = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/api\/v\d+\/?$/, '')

export function getImageUrl(thumbnail) {
  if (!thumbnail) return null
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) return thumbnail
  if (thumbnail.startsWith('/')) return `${_API_BASE}${thumbnail}`
  return thumbnail
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