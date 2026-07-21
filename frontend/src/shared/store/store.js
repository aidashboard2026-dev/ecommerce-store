import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/admin/store/authSlice'
import themeReducer from '@/admin/store/themeSlice'
import uiReducer from '@/admin/store/uiSlice'
import customerReducer from '@/storefront/store/customerSlice'
import cartReducer from '@/storefront/store/cartSlice'
import wishlistReducer from '@/storefront/store/wishlistSlice'
import checkoutReducer from '@/storefront/store/checkoutStore'

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
