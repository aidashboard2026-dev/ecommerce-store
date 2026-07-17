import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '@/shared/services/api'

// â”€â”€ Boot-time rehydration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Read persisted session from localStorage so Redux starts with the real state.
// Without this, token is always null on page load â†’ fetchMeThunk never fires â†’
// initialized stays false â†’ every ProtectedRoute spins forever.

const _persistedToken = localStorage.getItem('admin_token')

// â”€â”€ Thunks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login({ email, password })
      return res.data
    } catch (err) {
      return rejectWithValue({
        detail: err.response?.data?.detail || 'Login failed',
        status: err.response?.status
      })
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
      const status = err.response?.status
      // Only a real 401/403 means the token itself is invalid/expired.
      // Anything else (network failure, timeout, 5xx) is transient and
      // should not log the admin out of a session that may still be valid.
      return rejectWithValue({ sessionExpired: status === 401 || status === 403 })
    }
  },
  {
    condition: (_, { getState }) => {
      const { auth } = getState();
      if (auth.loading) {
        return false;
      }
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

// â”€â”€ Slice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: _persistedToken || null,
    admin: null,
    loading: false,
    error: null,
    // If no token exists at boot, there is nothing to fetch â†’ already initialized.
    // If a token exists, App.jsx will dispatch fetchMeThunk â†’ initialized flips
    // to true when that resolves (fulfilled or rejected).
    initialized: !_persistedToken,
  },
  reducers: {
    logout(state) {
      if (import.meta.env.DEV) console.log("[Auth Isolation: Admin] Logout. Clearing admin session.");
      state.token = null
      state.admin = null
      state.error = null
      localStorage.removeItem('admin_token')
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // â”€â”€ Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      .addCase(loginThunk.fulfilled,(state,action)=>{

        state.loading=false
        state.error=null
        state.initialized=true

        if (action.payload?.auth_type === "admin") {
          state.token=action.payload.access_token
          state.admin=action.payload.admin

          localStorage.setItem(
              "admin_token",
              action.payload.access_token
          )
        }

      })
      .addCase(loginThunk.rejected,  (state, action) => {
        state.loading = false;
        state.error = action.payload && typeof action.payload === 'object' ? action.payload.detail : action.payload;
      })

      // â”€â”€ fetchMe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.admin       = action.payload
        state.initialized = true
      })
      .addCase(fetchMeThunk.rejected, (state, action) => {
        state.initialized = true
        if (action.payload?.sessionExpired) {
          // Token is genuinely invalid/expired â€” clear everything
          state.token = null
          state.admin = null
          localStorage.removeItem('admin_token')
        }
        // Otherwise (network/server error): keep the existing session as-is
        // and let the next authenticated request retry naturally.
      })

      // â”€â”€ Signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      .addCase(signupThunk.pending,   (state)         => { state.loading = true;  state.error = null })
      .addCase(signupThunk.fulfilled, (state)         => { state.loading = false })
      .addCase(signupThunk.rejected,  (state, action) => { state.loading = false; state.error = action.payload })
      
      // â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      .addCase(logoutThunk.fulfilled, (state) => { state.loading = false })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
