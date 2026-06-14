import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach JWT token to every request ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Handle 401s globally ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const publicPaths = ['/login', '/signup', '/auth/login', '/auth/signup']
      const isPublicPage = publicPaths.some(p => window.location.pathname.startsWith(p))
      if (!isPublicPage) {
        const isAdminPage = window.location.pathname.startsWith('/admin')
        localStorage.removeItem('token')
        localStorage.removeItem('admin')
        localStorage.removeItem('customer')
        localStorage.removeItem('customer_token')

        if (isAdminPage) {
          window.location.href = '/admin/login'
        } else {
          window.location.href = '/auth/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  // Admin auth
  login:  (email, password) => api.post('/auth/login', { email, password }),
  getMe:  ()                => api.get('/auth/me'),
  logout: ()                => api.post('/auth/logout'),

  // Customer auth — FIX: signup was undefined (TypeError in signupThunk)
  signup:        (data)            => api.post('/auth/signup', data),
  customerLogin: (email, password) => api.post('/auth/customer/login', { email, password }),
  customerMe:    ()                => api.get('/auth/customer/me'),
}

// ─── Admins ───────────────────────────────────────────────────────────────────
export const adminsAPI = {
  list:   (skip = 0, limit = 100) => api.get(`/admins/?skip=${skip}&limit=${limit}`),
  count:  ()                       => api.get('/admins/count'),
  get:    (id)                     => api.get(`/admins/${id}`),
  create: (data)                   => api.post('/admins/', data),
  update: (id, data)               => api.put(`/admins/${id}`, data),
  delete: (id)                     => api.delete(`/admins/${id}`),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  stats:          ()                        => api.get('/dashboard/stats'),
  chartData:      ()                        => api.get('/dashboard/chart-data'),
  salesChart:     (period = 'weekly', anchorDate) =>
    api.get('/dashboard/sales-chart', { params: { period, anchor_date: anchorDate } }),
  recentActivity: ()                        => api.get('/dashboard/recent-activity'),
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersAPI = {
  list:   (skip = 0, limit = 100) => api.get(`/orders/?skip=${skip}&limit=${limit}`),
  create: (data)                   => api.post('/orders/', data),
  update: (id, data)               => api.put(`/orders/${id}`, data),
  cancel: (id)                     => api.post(`/orders/${id}/cancel`),
}

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersAPI = {
  list:        (params = {}) => api.get('/customers/', { params }),
  get:         (id)          => api.get(`/customers/${id}`),
  profile:     (id)          => api.get(`/customers/${id}/profile`),
  create:      (data)        => api.post('/customers/', data),
  update:      (id, data)    => api.put(`/customers/${id}`, data),
  setStatus:   (id, is_active)  => api.patch(`/customers/${id}/status`, { is_active }),
  updateNotes: (id, notes)      => api.patch(`/customers/${id}/notes`, { notes }),
  updateTags:  (id, tags)       => api.patch(`/customers/${id}/tags`, { tags }),
  analytics:   ()               => api.get('/customers/analytics'),
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  adminList: (params) => {
    // Strip empty string params so FastAPI doesn't reject "" as an invalid enum value
    const cleaned = {}
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value != null) cleaned[key] = value
    }
    return api.get('/products/admin/all', { params: cleaned })
  },

  get:    (id)       => api.get(`/products/admin/${id}`),
  create: (data)     => api.post('/products/admin', data),
  update: (id, data) => api.patch(`/products/admin/${id}`, data),
  delete: (id)       => api.delete(`/products/admin/${id}`),

  // ── Variants ───────────────────────────────────────────────────────────────

  createVariant: (productId, data) =>
    api.post(`/products/admin/${productId}/variants`, data),

  // FIX (CRIT-05): was MISSING — InlineProductForm.jsx line 319 called
  // productsApi.deleteVariant(...) which threw "is not a function" at runtime,
  // silently breaking variant delete in edit mode.
  deleteVariant: (productId, variantId) =>
    api.delete(`/products/admin/${productId}/variants/${variantId}`),

  // FIX (CRIT-05): was MISSING — InlineProductForm.jsx batchSave line 413 called
  // productsApi.bulkCreateVariants(...) which threw "is not a function" at runtime,
  // completely breaking the create flow for any product that has variants.
  bulkCreateVariants: (productId, variantsPayload) =>
    api.post(`/products/admin/${productId}/variants/bulk`, variantsPayload),

  // ── Images ─────────────────────────────────────────────────────────────────

  uploadImage: (productId, formData) =>
    api.post(`/products/admin/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Renamed for clarity: deletes the product's current thumbnail
  deleteProductImage: (productId) =>
    api.delete(`/products/admin/images/${productId}`),

  // Backward-compat alias
  deleteImage: (productId) =>
    api.delete(`/products/admin/images/${productId}`),
}

// ─── Storefront Client ────────────────────────────────────────────────────────
export const storefrontAPI = {
  // Products
  getProducts: (params = {}) => api.get('/products/', { params }),
  getProductBySlug: (slug) => api.get(`/products/slug/${slug}`),
  
  // Banners & Offers
  getBanners: () => api.get('/banners/active/all'),
  getOffers: () => api.get('/offers/active/all'),
  
  // Orders
  createOrder: (data) => api.post('/orders/customer', data),
  getOrders: () => api.get('/orders/customer/all'),
  getOrder: (id) => api.get(`/orders/customer/${id}`),
  cancelOrder: (id) => api.post(`/orders/customer/${id}/cancel`),
  trackOrder: (orderNumber) => api.get(`/orders/track/${orderNumber}`),
  
  // Profile
  updateProfile: (data) => api.put('/customers/profile/update', data),
}

export default api