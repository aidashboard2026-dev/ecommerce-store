// NOTE: The backend currently exposes no /cart endpoints. The cart is
// implemented client-side via Redux + localStorage (see store/cartSlice.js),
// which covers both guest and logged-in users on this device. This service
// exists as the designated integration point: if/when a server-side cart API
// (POST/GET/PUT/DELETE /cart) ships, the persistence calls below are where
// that sync would be wired in without touching component code.

const STORAGE_KEY = 'aurastore_cart'

export function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export function clearStoredCart() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
