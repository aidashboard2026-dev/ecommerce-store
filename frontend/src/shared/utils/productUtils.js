import { useState, useEffect } from 'react'

/**
 * Resolve an image URL for rendering.
 *
 * Architecture: images are stored 100% in Supabase Storage.
 * Every persisted image URL in the database is an absolute https:// URL.
 *
 * Rules:
 *   1. Falsy / empty → return '' (component renders its own fallback UI)
 *   2. blob: / data: → return as-is (local file previews during upload)
 *   3. http:// or https:// → return as-is (Supabase, Firebase, CDN — all real URLs)
 *   4. Anything else (legacy relative paths, /uploads/...) → return ''
 *      These cannot be served in a Supabase-only architecture.
 */
export function getImageUrl(path) {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (!trimmed) return '';
  // Blob previews and data URIs — local upload previews before the file is persisted
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;
  // Absolute URLs (Supabase public URL, any https:// CDN link) — return unchanged
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  // Relative paths and legacy /uploads/... paths cannot be resolved without a backend.
  // Return '' so the calling component falls through to its own placeholder/fallback UI.
  return '';
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

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'د.إ',
}

/** Format a numeric price based on store currency */
export function formatPrice(value) {
  if (value == null) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  const currency = localStorage.getItem('store_currency') || 'INR'
  const symbol = CURRENCY_SYMBOLS[currency] || '₹'
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export function getApiErrorMessage(error, fallback = "Something went wrong") {
  if (!error) return fallback;

  // Extract from Axios/Fetch response data
  const responseData = error.response?.data;
  const detail = responseData?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.msg || JSON.stringify(item);
      }
      return String(item);
    }).join(", ");
  }

  if (detail && typeof detail === "object") {
    if (Array.isArray(detail.errors)) {
      return detail.errors.join(", ");
    }
    if (typeof detail.message === "string") {
      return detail.message;
    }
  }

  if (responseData && typeof responseData === "object") {
    if (Array.isArray(responseData.errors)) {
      return responseData.errors.join(", ");
    }
    if (typeof responseData.message === "string") {
      return responseData.message;
    }
  }

  // Fallback to standard Error message
  if (typeof error.message === "string" && error.message) {
    return error.message;
  }

  return fallback;
}