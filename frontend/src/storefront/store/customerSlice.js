import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI, customerAuthAPI, storefrontAPI } from '@/shared/services/api'
import { login, signup, googleLogin } from "@/firebase/auth";
import axios from "axios";

const TOKEN_KEY = 'customer_token'
const CUSTOMER_KEY = 'customer'

const _persistedToken = localStorage.getItem(TOKEN_KEY)
const _persistedCustomer = (() => {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) } catch { return null }
})()

// ── Thunks ────────────────────────────────────────────────────────────────────

export const customerLoginThunk = createAsyncThunk(
  "customer/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Firebase Login
      const credential = await login(email, password);

      // Email verification check
      if (!credential.user.emailVerified) {
        throw new Error("Please verify your email before login.");
      }

      // Firebase ID Token
      const idToken = await credential.user.getIdToken();

      // Backend Login
      const res = await axios.post("/api/v1/auth/firebase/login", {
        id_token: idToken,
      });

      return res.data;

    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail ||
        err.message ||
        "Login failed"
      );
    }
  }
);

export const customerSignupThunk = createAsyncThunk(
  "customer/signup",
  async ({ email, password }, { rejectWithValue }) => {
    try {

      await signup(email, password);

      return {
        message:
          "Verification email sent. Please verify your email before login.",
      };

    } catch (err) {
      return rejectWithValue(
        err.message || "Signup failed"
      );
    }
  }
);

export const customerLogoutThunk = createAsyncThunk(
  "customer/logout",
  async (_, { dispatch }) => {

    const { logout } = await import("@/firebase/auth");

    await logout();

    dispatch(customerLogout());
  }
);

export const fetchCustomerMeThunk = createAsyncThunk(
  'customer/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await customerAuthAPI.me()
      return res.data
    } catch (err) {
      const status = err.response?.status
      return rejectWithValue({ sessionExpired: status === 401 || status === 403 })
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
      .addCase(fetchCustomerMeThunk.rejected, (state, action) => {
        state.initialized = true
        if (action.payload?.sessionExpired) {
          state.token = null
          state.customer = null
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(CUSTOMER_KEY)
        }
      })

      .addCase(updateCustomerProfileThunk.fulfilled, (state, action) => {
        state.customer = { ...state.customer, ...action.payload }
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(state.customer))
      })
  },
})

export const { customerLogout, clearCustomerError } = customerSlice.actions
export default customerSlice.reducer
