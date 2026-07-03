import { createSlice, createSelector } from "@reduxjs/toolkit";
const STORAGE_KEY = "aurastore_cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

// A cart line is uniquely identified by productId + size + color
function sameLine(a, b) {
  return (
    String(a.productId) === String(b.productId) && a.size === b.size && a.color === b.color
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

    closeCartDrawer(state) {
      state.isDrawerOpen = false;
    },
  },
});

export const {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
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

// export const selectShippingCost = (state) => {
//   const subtotal = selectCartSubtotal(state);
//   if (subtotal === 0) return 0;
//   return subtotal >= SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
// };

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
    const tax = discountedSubtotal * TAX_RATE;
    const total = discountedSubtotal + shipping + tax;

    return {
      subtotal,
      discountAmount,
      discountedSubtotal,
      shipping,
      tax,
      total,
    };
  },
);
