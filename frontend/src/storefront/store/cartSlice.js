// cartSlice.js
import { createSelector, createSlice } from "@reduxjs/toolkit";

import {
  addCustomerCartItemThunk,
  removeCustomerCartItemThunk,
  updateCustomerCartQuantityThunk,
} from "./customerCartThunks";

import { normalizeCartItem } from "../services/customerCollectionSync";
import {
  calculateCheckoutTotals,
  calculateLineTotal,
} from "@/shared/utils/checkoutTotals";

const GUEST_CART_KEY = "aurastore_guest_cart";
const COUPON_KEY = "aurastore_coupon";
const SHIPPING_FEE_KEY = "aurastore_shipping_fee";

function loadCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    if (!raw) return { couponCode: null, couponDiscount: 0, couponError: null };
    return JSON.parse(raw);
  } catch {
    return { couponCode: null, couponDiscount: 0, couponError: null };
  }
}

function persistCoupon(code, discount, error) {
  try {
    localStorage.setItem(COUPON_KEY, JSON.stringify({ couponCode: code, couponDiscount: discount, couponError: error }));
  } catch { /* ignore */ }
}

function loadShippingFee() {
  try {
    const raw = localStorage.getItem(SHIPPING_FEE_KEY);
    if (raw === null || raw === undefined || raw === "") {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function persistShippingFee(fee) {
  try {
    localStorage.setItem(SHIPPING_FEE_KEY, String(Number(fee) || 0));
  } catch { /* ignore */ }
}

function loadCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.map(normalizeCartItem);
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

const initialCoupon = loadCoupon();

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: loadCart(),
    couponCode: initialCoupon.couponCode ?? null,
    couponDiscount: initialCoupon.couponDiscount ?? 0,
    couponError: initialCoupon.couponError ?? null,
    shippingFee: loadShippingFee(),
    isDrawerOpen: false,
    syncLoading: false,
    syncError: null,
  },
  reducers: {
    addToCart(state, action) {
      const incoming = normalizeCartItem(action.payload);
      const existing = state.items.find((i) => sameLine(i, incoming));
      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + (incoming.quantity || 1),
          existing.stockQuantity ?? 99,
        );
      } else {
        state.items.push({ ...incoming });
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
      persistCoupon(null, 0, null);
    },
    replaceCartItems(state, action) {
      const raw = Array.isArray(action.payload) ? action.payload : [];

      state.items = raw.map(normalizeCartItem);

      persist(state.items);
    },

    clearCartState(state) {
      state.items = [];

      state.couponCode = null;
      state.couponDiscount = 0;
      state.couponError = null;
      persistCoupon(null, 0, null);
    },
    applyCoupon(state, action) {
      const { code, discount } = action.payload;
      state.couponCode = code;
      state.couponDiscount = discount;
      state.couponError = null;
      persistCoupon(code, discount, null);
    },
    setCouponError(state, action) {
      state.couponError = action.payload;
      state.couponCode = null;
      state.couponDiscount = 0;
      persistCoupon(null, 0, action.payload);
    },
    removeCoupon(state) {
      state.couponCode = null;
      state.couponDiscount = 0;
      state.couponError = null;
      persistCoupon(null, 0, null);
    },

    setShippingFee(state, action) {
      const fee = Number(action.payload) || 0;
      state.shippingFee = fee >= 0 ? fee : 0;
      persistShippingFee(state.shippingFee);
    },

    openCartDrawer(state) {
      state.isDrawerOpen = true;
    },
    setCartItems(state, action) {
      const incomingItems = Array.isArray(action.payload) ? action.payload : [];

      const uniqueItems = [];

      for (const item of incomingItems) {
        const normalized = normalizeCartItem(item);

        const existing = uniqueItems.find((currentItem) =>
          sameLine(currentItem, normalized),
        );

        if (existing) {
          existing.quantity =
            Number(normalized.quantity) || Number(existing.quantity) || 1;

          Object.assign(existing, normalized);
        } else {
          uniqueItems.push(normalized);
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

          const incoming = normalizeCartItem(action.payload);

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
          const updatedItem = normalizeCartItem(action.payload);

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
  setShippingFee,

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

export const selectShippingCost = createSelector(
  [selectCartSubtotal, (state) => state.cart.shippingFee],
  (subtotal, shippingFee) => (subtotal > 0 ? Number(shippingFee) || 0 : 0),
);

// GST-style flat tax rate applied to subtotal after discount
export const TAX_RATE = 0.05;

export const selectCartTotals = createSelector(
  [
    (state) => state.cart.items,
    selectShippingCost,
    (state) => state.cart.couponDiscount,
  ],
  (items, shipping, couponDiscount) =>
    calculateCheckoutTotals({
      items,
      couponDiscount,
      shippingFee: shipping,
    }),
);

export const selectCartLineItems = createSelector(
  [(state) => state.cart.items],
  (items) =>
    items.map((item) => ({
      id: `${item.productId}-${item.size}-${item.color}`,
      title: item.title,
      price: Number(item.sellingPrice) || 0,
      quantity: Number(item.quantity) || 1,
      lineTotal: calculateLineTotal(item.sellingPrice, item.quantity),
    })),
);
