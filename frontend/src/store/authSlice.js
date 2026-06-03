import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '../services/api'

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login(email, password)
      console.log("EMAIL SENT =", email)
      console.log("PASSWORD SENT =", password)
      console.log("LOGIN RESPONSE =", res.data)
      
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('admin', JSON.stringify(res.data.admin))

      console.log("TOKEN SAVED =", localStorage.getItem("token"))
      console.log("ADMIN SAVED =", localStorage.getItem("admin"))
      return res.data
    } catch (err) {
      console.log("LOGIN ERROR =", err.response?.data)
      console.log("STATUS =", err.response?.status)

      return rejectWithValue(
        err.response?.data?.detail || 'Login failed'
      )
    }
  }
)

export const fetchMeThunk = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authAPI.getMe()
      return res.data
    } catch (err) {
      localStorage.removeItem('token')
      localStorage.removeItem('admin')
      return rejectWithValue('Session expired')
    }
  }
)

const token = localStorage.getItem('token')
const admin = localStorage.getItem('admin')

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: token || null,
    admin: admin ? JSON.parse(admin) : null,
    loading: false,
    error: null,
    initialized: false,
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
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.access_token
        state.admin = action.payload.admin
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.admin = action.payload
        state.initialized = true
      })
      .addCase(fetchMeThunk.rejected, (state) => {
        state.token = null
        state.admin = null
        state.initialized = true
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
