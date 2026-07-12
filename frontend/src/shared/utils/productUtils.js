import { useState, useEffect } from 'react'
const BACKEND_ORIGIN = (
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

export function getImageUrl(path) {
  if (!path) return "";

  const imagePath = String(path).trim();

  // Firebase, Supabase, Cloudinary or other external URL
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("blob:") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }

  // Remove starting slashes
  const cleanPath = imagePath.replace(/^\/+/, "");

  // Already contains uploads/
  if (cleanPath.startsWith("uploads/")) {
    return `${BACKEND_ORIGIN}/${cleanPath}`;
  }

  // DB value:
  // products/shirt/product-name/thumbnail.jpg
  if (cleanPath.startsWith("products/")) {
    return `${BACKEND_ORIGIN}/uploads/${cleanPath}`;
  }

  // DB value:
  // shirt/product-name/thumbnail.jpg
  return `${BACKEND_ORIGIN}/uploads/products/${cleanPath}`;
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