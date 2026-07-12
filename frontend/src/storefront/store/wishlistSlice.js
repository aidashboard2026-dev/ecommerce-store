// wishlistSlice.js
import { createSlice } from "@reduxjs/toolkit";

// const STORAGE_KEY = 'aurastore_wishlist'
const GUEST_WISHLIST_KEY = "aurastore_guest_wishlist";

function loadWishlist() {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: {
    items: loadWishlist(), // [{ productId, title, slug, thumbnail, minPrice }]
  },
  reducers: {
    toggleWishlist(state, action) {
      const product = action.payload;
      const idx = state.items.findIndex(
        (i) => String(i.productId) === String(product.productId),
      );
      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.push(product);
      }
      persist(state.items);
    },
    removeFromWishlist(state, action) {
      state.items = state.items.filter(
        (i) => String(i.productId) !== String(action.payload),
      );
      persist(state.items);
    },
    clearWishlist(state) {
      state.items = [];
      persist(state.items);
    },
    replaceWishlistItems(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : [];

      persist(state.items);
    },

    clearWishlistState(state) {
      // Redux state clear.
      // Customer database wishlist delete no.

      state.items = [];
    },
  },
});

export const {
  toggleWishlist,
  removeFromWishlist,
  clearWishlist,

  replaceWishlistItems,
  clearWishlistState,
} = wishlistSlice.actions;
export default wishlistSlice.reducer;

export const selectIsWishlisted = (productId) => (state) =>
  state.wishlist.items.some((i) => String(i.productId) === String(productId));
