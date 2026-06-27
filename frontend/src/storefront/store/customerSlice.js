import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI, customerAuthAPI, storefrontAPI } from '@/shared/services/api'

const TOKEN_KEY = 'customer_token'
const CUSTOMER_KEY = 'customer'

const _persistedToken = localStorage.getItem(TOKEN_KEY)
const _persistedCustomer = (() => {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) } catch { return null }
})()

// ── Thunks ────────────────────────────────────────────────────────────────────

export const customerLoginThunk = createAsyncThunk(
  'customer/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await customerAuthAPI.login({ email, password })
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Login failed')
    }
  }
)

export const customerSignupThunk = createAsyncThunk(
  'customer/signup',
  async (data, { rejectWithValue }) => {
    try {
      const res = await authAPI.signup(data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Signup failed')
    }
  }
)

export const fetchCustomerMeThunk = createAsyncThunk(
  'customer/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await customerAuthAPI.me()
      return res.data
    } catch (err) {
      return rejectWithValue('Session expired')
    }
  }
)

export const updateCustomerProfileThunk = createAsyncThunk(
  'customer/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      const res = await storefrontAPI.updateProfile(data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Update failed')
    }
  }
)

export const customerLogoutThunk = createAsyncThunk(
  'customer/logout',
  async (_, { dispatch }) => {
    try { await customerAuthAPI.logout() } catch (err) { void err }
    dispatch(customerLogout())
  }
)

const customerSlice = createSlice({
  name: 'customer',
  initialState: {
    token: _persistedToken || null,
    customer: _persistedCustomer || null,
    loading: false,
    error: null,
    // Mirrors the admin auth pattern: if no token at boot, nothing to fetch → already initialized.
    // App.jsx dispatches fetchCustomerMeThunk → initialized flips true when it resolves.
    initialized: !_persistedToken,
  },
  reducers: {
    customerLogout(state) {
      state.token = null
      state.customer = null
      state.error = null
      state.initialized = true
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(CUSTOMER_KEY)
    },
    clearCustomerError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(customerLoginThunk.pending, (state) => { state.loading = true; state.error = null })
      .addCase(customerLoginThunk.fulfilled, (state, action) => {
        state.loading = false
        state.initialized = true
        state.token = action.payload.access_token
        state.customer = action.payload.customer
        localStorage.setItem(TOKEN_KEY, action.payload.access_token)
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(action.payload.customer))
      })
      .addCase(customerLoginThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      .addCase(customerSignupThunk.pending, (state) => { state.loading = true; state.error = null })
      .addCase(customerSignupThunk.fulfilled, (state) => { state.loading = false })
      .addCase(customerSignupThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      .addCase(fetchCustomerMeThunk.fulfilled, (state, action) => {
        state.customer = action.payload
        state.initialized = true
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(action.payload))
      })
      .addCase(fetchCustomerMeThunk.rejected, (state) => {
        state.token = null
        state.customer = null
        state.initialized = true
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(CUSTOMER_KEY)
      })

      .addCase(updateCustomerProfileThunk.fulfilled, (state, action) => {
        state.customer = { ...state.customer, ...action.payload }
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(state.customer))
      })
  },
})

export const { customerLogout, clearCustomerError } = customerSlice.actions
export default customerSlice.reducer
