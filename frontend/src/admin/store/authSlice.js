import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '@/shared/services/api'

// ── Boot-time rehydration ─────────────────────────────────────────────────────
// Read persisted session from localStorage so Redux starts with the real state.
// Without this, token is always null on page load → fetchMeThunk never fires →
// initialized stays false → every ProtectedRoute spins forever.

const _persistedToken = localStorage.getItem('token')
const _persistedAdmin = (() => {
  try { return JSON.parse(localStorage.getItem('admin')) } catch { return null }
})()

// ── Thunks ────────────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login({ email, password })
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Login failed')
    }
  }
)

export const fetchMeThunk = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authAPI.me()
      return res.data
    } catch (err) {
      return rejectWithValue('Session expired')
    }
  }
)

export const signupThunk = createAsyncThunk(
  'auth/signup',
  async (data, { rejectWithValue }) => {
    try {
      const res = await authAPI.signup(data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Signup failed')
    }
  }
)

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try { await authAPI.logout() } catch (err) { void err }
    dispatch(logout())
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: _persistedToken || null,
    admin: _persistedAdmin || null,
    loading: false,
    error: null,
    // If no token exists at boot, there is nothing to fetch → already initialized.
    // If a token exists, App.jsx will dispatch fetchMeThunk → initialized flips
    // to true when that resolves (fulfilled or rejected).
    initialized: !_persistedToken,
  },
  reducers: {
    logout(state) {
      state.token = null
      state.admin = null
      state.error = null
      localStorage.removeItem('token')
      localStorage.removeItem('admin')
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Login ──────────────────────────────────────────────────────────────
      .addCase(loginThunk.fulfilled, (state, action) => {
        console.log("LOGIN PAYLOAD =", action.payload)

        state.loading = false
        state.token = action.payload.access_token
        state.admin = action.payload.admin

        localStorage.setItem('token', action.payload.access_token)
        localStorage.setItem('admin', JSON.stringify(action.payload.admin))

        console.log("TOKEN SAVED =", localStorage.getItem('token'))
      })
      .addCase(loginThunk.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

      // ── fetchMe ────────────────────────────────────────────────────────────
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.admin       = action.payload
        state.initialized = true
        // Keep admin cache fresh in case name/role was updated server-side
        localStorage.setItem('admin', JSON.stringify(action.payload))
      })
      .addCase(fetchMeThunk.rejected, (state) => {
        // Token is invalid/expired — clear everything
        state.token       = null
        state.admin       = null
        state.initialized = true
        localStorage.removeItem('token')
        localStorage.removeItem('admin')
      })

      // ── Signup ─────────────────────────────────────────────────────────────
      .addCase(signupThunk.pending,   (state)         => { state.loading = true;  state.error = null })
      .addCase(signupThunk.fulfilled, (state)         => { state.loading = false })
      .addCase(signupThunk.rejected,  (state, action) => { state.loading = false; state.error = action.payload })
      
      // ── Logout ─────────────────────────────────────────────────────────────
      .addCase(logoutThunk.fulfilled, (state) => { state.loading = false })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer