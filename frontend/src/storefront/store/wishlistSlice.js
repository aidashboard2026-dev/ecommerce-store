import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'aurastore_wishlist'

function loadWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: loadWishlist(), // [{ productId, title, slug, thumbnail, minPrice }]
  },
  reducers: {
    toggleWishlist(state, action) {
      const product = action.payload
      const idx = state.items.findIndex((i) => String(i.productId) === String(product.productId))
      if (idx >= 0) {
        state.items.splice(idx, 1)
      } else {
        state.items.push(product)
      }
      persist(state.items)
    },
    removeFromWishlist(state, action) {
      state.items = state.items.filter((i) => String(i.productId) !== String(action.payload))
      persist(state.items)
    },
    clearWishlist(state) {
      state.items = []
      persist(state.items)
    },
  },
})

export const { toggleWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer

export const selectIsWishlisted = (productId) => (state) =>
  state.wishlist.items.some((i) => String(i.productId) === String(productId))
