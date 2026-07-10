import { createSlice } from '@reduxjs/toolkit'

const ADDRESS_KEY = 'aurastore_addresses'
const LAST_ORDER_KEY = 'aurastore_last_order'

function loadAddresses() {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistAddresses(addresses) {
  try {
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses))
  } catch {
    /* ignore */
  }
}

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: {
    addresses: loadAddresses(),
    selectedAddressId: null,
    paymentMethod: 'COD', // COD | UPI | CARD | WALLET | NETBANKING
    couponCode: '',
    lastOrder: (() => {
      try { return JSON.parse(localStorage.getItem(LAST_ORDER_KEY)) } catch { return null }
    })(),
    placingOrder: false,
    orderError: null,
    checkoutPayload: null,
  },
  reducers: {
    addAddress(state, action) {
      const address = { id: crypto.randomUUID(), ...action.payload }
      state.addresses.push(address)
      state.selectedAddressId = address.id
      persistAddresses(state.addresses)
    },
    updateAddress(state, action) {
      const idx = state.addresses.findIndex((a) => a.id === action.payload.id)
      if (idx >= 0) {
        state.addresses[idx] = { ...state.addresses[idx], ...action.payload }
        persistAddresses(state.addresses)
      }
    },
    removeAddress(state, action) {
      state.addresses = state.addresses.filter((a) => a.id !== action.payload)
      if (state.selectedAddressId === action.payload) {
        state.selectedAddressId = state.addresses[0]?.id ?? null
      }
      persistAddresses(state.addresses)
    },
    selectAddress(state, action) {
      state.selectedAddressId = action.payload
    },
    setPaymentMethod(state, action) {
      state.paymentMethod = action.payload
    },
    setPlacingOrder(state, action) {
      state.placingOrder = action.payload
    },
    setOrderError(state, action) {
      state.orderError = action.payload
    },
    setLastOrder(state, action) {
      state.lastOrder = action.payload
      try {
        localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(action.payload))
      } catch {
        /* ignore */
      }
    },
    setCheckoutPayload(state, action) {
      state.checkoutPayload = action.payload
    },

    clearCheckoutPayload(state) {
      state.checkoutPayload = null
    },
  },
})

export const {
  addAddress,
  updateAddress,
  removeAddress,
  selectAddress,
  setPaymentMethod,
  setPlacingOrder,
  setOrderError,
  setLastOrder,

  setCheckoutPayload,
  clearCheckoutPayload,

} = checkoutSlice.actions

export default checkoutSlice.reducer

export const selectSelectedAddress = (state) =>
  state.checkout.addresses.find((a) => a.id === state.checkout.selectedAddressId) || null
