import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import themeReducer from './themeSlice'
import uiReducer from './uiSlice'
import customerReducer from './customerSlice'
import cartReducer from './cartSlice'
import wishlistReducer from './wishlistSlice'
import checkoutReducer from './checkoutStore'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    ui: uiReducer,
    customer: customerReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    checkout: checkoutReducer,
  },
})
