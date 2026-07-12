import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

import { login, signup } from "@/firebase/auth";
import { storefrontAPI } from "@/shared/services/api";
import { clearCart } from "@/storefront/store/cartSlice";
import { clearWishlist } from "@/storefront/store/wishlistSlice";

const TOKEN_KEY = "customer_token";
const CUSTOMER_KEY = "customer";

const readStoredCustomer = () => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY));
  } catch {
    return null;
  }
};

const persistSession = ({ customer, token }) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  if (customer) {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  }
};

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_KEY);
  delete axios.defaults.headers.common.Authorization;
};

export const customerLoginThunk = createAsyncThunk(
  "customer/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const credential = await login(email, password);

      if (!credential.user.emailVerified) {
        throw new Error("Please verify your email before login.");
      }

      const idToken = await credential.user.getIdToken(true);
      const res = await axios.post("/api/v1/auth/firebase/login", {
        id_token: idToken,
      });

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail ||
          err.message ||
          "Login failed",
      );
    }
  },
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
      return rejectWithValue(err.message || "Signup failed");
    }
  },
);

export const customerLogoutThunk = createAsyncThunk(
  "customer/logout",
  async (_, { dispatch }) => {
    try {
      const { logout } = await import("@/firebase/auth");

      await logout();
    } catch (error) {
      console.error("Firebase logout failed:", error);
    } finally {
      dispatch(customerLogout());
    }
  },
);

export const fetchCustomerMeThunk = createAsyncThunk(
  "customer/fetchMe",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return rejectWithValue({ noToken: true });
    }

    try {
      const res = await axios.get("/api/v1/auth/customer/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    } catch (err) {
      const status = err.response?.status;

      return rejectWithValue({
        sessionExpired: status === 401 || status === 403,
        message:
          err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to restore customer session",
      });
    }
  },
  {
    condition: (_, { getState }) => {
      const { customer } = getState();
      if (customer.loading) {
        return false;
      }
    }
  }
);

export const updateCustomerProfileThunk = createAsyncThunk(
  "customer/updateProfile",
  async (data, { rejectWithValue }) => {
    try {
      const res = await storefrontAPI.updateProfile(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Update failed");
    }
  },
);

const initialState = {
  customer: readStoredCustomer(),
  token: localStorage.getItem(TOKEN_KEY),
  initialized: false,
  loading: false,
  error: null,
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setCustomerSession(state, action) {
      const { customer, token } = action.payload;

      state.customer = customer;
      state.token = token;
      state.initialized = true;
      state.loading = false;
      state.error = null;

      persistSession({ customer, token });
    },
    setCredentials(state, action) {
      const { customer, token } = action.payload;

      state.customer = customer;
      state.token = token;
      state.initialized = true;
      state.loading = false;
      state.error = null;

      persistSession({ customer, token });
    },
    initializeCustomerAuth(state) {
      state.initialized = true;
      state.loading = false;
    },
    customerLogout(state) {
      state.token = null;
      state.customer = null;
      state.error = null;
      state.loading = false;
      state.initialized = true;

      clearSession();
    },
    clearCustomerError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(customerLoginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(customerLoginThunk.fulfilled, (state, action) => {
        const token = action.payload.access_token;
        const customer = action.payload.customer;

        state.loading = false;
        state.initialized = true;
        state.token = token;
        state.customer = customer;

        persistSession({ customer, token });
      })
      .addCase(customerLoginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(customerSignupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(customerSignupThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(customerSignupThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchCustomerMeThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerMeThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.customer = action.payload;
        state.token = localStorage.getItem(TOKEN_KEY);

        persistSession({
          customer: action.payload,
          token: state.token,
        });
      })
      .addCase(fetchCustomerMeThunk.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;

        if (action.payload?.sessionExpired || action.payload?.noToken) {
          state.token = null;
          state.customer = null;
          clearSession();
        } else {
          state.error = action.payload?.message || null;
        }
      })

      .addCase(updateCustomerProfileThunk.fulfilled, (state, action) => {
        const updatedCustomer = action.payload?.customer || action.payload;

        state.customer = {
          ...state.customer,
          ...updatedCustomer,
        };

        persistSession({
          customer: state.customer,
          token: state.token,
        });
      });
  },
});

export const {
  clearCustomerError,
  customerLogout,
  initializeCustomerAuth,
  setCustomerSession,
  setCredentials,
} = customerSlice.actions;

export default customerSlice.reducer;
