// cartSlice.js
import { createSelector, createSlice } from "@reduxjs/toolkit";

import {
  addCustomerCartItemThunk,
  removeCustomerCartItemThunk,
  updateCustomerCartQuantityThunk,
} from "./customerCartThunks";

// const STORAGE_KEY = "aurastore_cart";
const GUEST_CART_KEY = "aurastore_guest_cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);

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
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

// A cart line is uniquely identified by productId + size + color
function sameLine(a, b) {
  const aVariantId = a.variantId ?? a.variant_id;

  const bVariantId = b.variantId ?? b.variant_id;

  // Variant ID is the primary cart identity
  if (aVariantId != null && bVariantId != null) {
    return String(aVariantId) === String(bVariantId);
  }

  // Fallback for old guest cart items
  return (
    String(a.productId ?? a.product_id) ===
      String(b.productId ?? b.product_id) &&
    String(a.size ?? "") === String(b.size ?? "") &&
    String(a.color ?? "") === String(b.color ?? "")
  );
}

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: loadCart(),
    couponCode: null,
    couponDiscount: 0, // percentage 0-100
    couponError: null,
    isDrawerOpen: false,
    syncLoading: false,
    syncError: null,
  },
  reducers: {
    addToCart(state, action) {
      const incoming = action.payload;
      const existing = state.items.find((i) => sameLine(i, incoming));
      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + (incoming.quantity || 1),
          existing.stockQuantity ?? 99,
        );
      } else {
        state.items.push({ ...incoming, quantity: incoming.quantity || 1 });
      }
      persist(state.items);
    },
    updateQuantity(state, action) {
      const { productId, size, color, quantity } = action.payload;
      const item = state.items.find((i) =>
        sameLine(i, { productId, size, color }),
      );
      if (item) {
        item.quantity = Math.max(
          1,
          Math.min(quantity, item.stockQuantity ?? 99),
        );
      }
      persist(state.items);
    },
    removeFromCart(state, action) {
      const { productId, size, color } = action.payload;
      state.items = state.items.filter(
        (i) => !sameLine(i, { productId, size, color }),
      );
      persist(state.items);
    },
    clearCart(state) {
      state.items = [];
      state.couponCode = null;
      state.couponDiscount = 0;
      state.couponError = null;

      persist(state.items);
    },
    replaceCartItems(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : [];

      persist(state.items);
    },

    clearCartState(state) {
      state.items = [];

      state.couponCode = null;
      state.couponDiscount = 0;
      state.couponError = null;
    },
    applyCoupon(state, action) {
      const { code, discount } = action.payload;
      state.couponCode = code;
      state.couponDiscount = discount;
      state.couponError = null;
    },
    setCouponError(state, action) {
      state.couponError = action.payload;
      state.couponCode = null;
      state.couponDiscount = 0;
    },
    removeCoupon(state) {
      state.couponCode = null;
      state.couponDiscount = 0;
      state.couponError = null;
    },

    openCartDrawer(state) {
      state.isDrawerOpen = true;
    },
    setCartItems(state, action) {
      const incomingItems = Array.isArray(action.payload) ? action.payload : [];

      const uniqueItems = [];

      for (const item of incomingItems) {
        const existing = uniqueItems.find((currentItem) =>
          sameLine(currentItem, item),
        );

        if (existing) {
          existing.quantity =
            Number(item.quantity) || Number(existing.quantity) || 1;

          Object.assign(existing, item);
        } else {
          uniqueItems.push(item);
        }
      }

      state.items = uniqueItems;

      persist(state.items);
    },
    closeCartDrawer(state) {
      state.isDrawerOpen = false;
    },
  },
  extraReducers: (builder) => {
    builder

      // Add customer DB cart item

      .addCase(
        addCustomerCartItemThunk.pending,

        (state) => {
          state.syncLoading = true;

          state.syncError = null;
        },
      )

      .addCase(
        addCustomerCartItemThunk.fulfilled,

        (state, action) => {
          state.syncLoading = false;

          const incoming = action.payload;

          const index = state.items.findIndex(
            (item) => Number(item.cartItemId) === Number(incoming.cartItemId),
          );

          if (index >= 0) {
            state.items[index] = incoming;
          } else {
            state.items.push(incoming);
          }
        },
      )

      .addCase(
        addCustomerCartItemThunk.rejected,

        (state, action) => {
          state.syncLoading = false;

          state.syncError = action.payload;
        },
      )

      // Update DB quantity

      .addCase(
        updateCustomerCartQuantityThunk.fulfilled,

        (state, action) => {
          const updatedItem = action.payload;

          const index = state.items.findIndex(
            (item) =>
              Number(item.cartItemId) === Number(updatedItem.cartItemId),
          );

          if (index >= 0) {
            state.items[index] = updatedItem;
          }
        },
      )

      // Remove DB cart item

      .addCase(
        removeCustomerCartItemThunk.fulfilled,

        (state, action) => {
          state.items = state.items.filter(
            (item) => Number(item.cartItemId) !== Number(action.payload),
          );
        },
      );
  },
});

export const {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  setCartItems,
  replaceCartItems,
  clearCartState,

  applyCoupon,
  setCouponError,
  removeCoupon,

  openCartDrawer,
  closeCartDrawer,
} = cartSlice.actions;

export default cartSlice.reducer;

// ── Selectors / derived totals ────────────────────────────────────────────────

export const selectCartSubtotal = createSelector(
  [(state) => state.cart.items],
  (items) =>
    items.reduce(
      (sum, item) => sum + Number(item.sellingPrice) * item.quantity,
      0,
    ),
);

export const selectCartOriginalTotal = createSelector(
  [(state) => state.cart.items],
  (items) =>
    items.reduce(
      (sum, item) =>
        sum + Number(item.originalPrice ?? item.sellingPrice) * item.quantity,
      0,
    ),
);

export const selectCartCount = createSelector(
  [(state) => state.cart.items],
  (items) => items.reduce((sum, item) => sum + item.quantity, 0),
);

// Simple shipping rule: free over ₹999, otherwise flat ₹79
export const SHIPPING_THRESHOLD = 999;
export const FLAT_SHIPPING_FEE = 79;

export const selectShippingCost = createSelector(
  [selectCartSubtotal],
  (subtotal) => {
    if (subtotal === 0) return 0;
    return subtotal >= SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  },
);

// GST-style flat tax rate applied to subtotal after discount
export const TAX_RATE = 0.05;

export const selectCartTotals = createSelector(
  [
    selectCartSubtotal,
    selectShippingCost,
    (state) => state.cart.couponDiscount,
  ],
  (subtotal, shipping, couponDiscount) => {
    const discountAmount = (subtotal * (couponDiscount || 0)) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    // const tax = discountedSubtotal * TAX_RATE;
    const total = discountedSubtotal + shipping;

    return {
      subtotal,
      discountAmount,
      discountedSubtotal,
      shipping,
      total,
    };
  },
);
