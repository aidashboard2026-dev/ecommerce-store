import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const paramsSerializer = (params) => {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v !== null && v !== undefined && v !== '') {
          q.append(key, v)
        }
      })
    } else if (value !== '') {
      q.append(key, value)
    }
  }
  return q.toString()
}

const api = axios.create({
  baseURL: BASE_URL,
  // withCredentials: admin uses Bearer token stored in localStorage.
  // Set to true so the httponly cookie set by the backend on login is also
  // sent — keeps both auth mechanisms in sync and future-proofs cookie-based refresh.
  withCredentials: true,
  paramsSerializer,
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
      localStorage.removeItem('token')
      localStorage.removeItem('admin')
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Storefront Axios instance ────────────────────────────────────────────────
// Bearer-token auth (matches backend: customer login returns a JWT for the
// Authorization header — there is no customer auth cookie on the backend).
// withCredentials stays true only so any future session/CSRF cookie usage
// works without another wiring pass; it has no effect on the bearer flow.

const storefrontClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  paramsSerializer,
})

storefrontClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('customer_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

storefrontClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('customer_token')
      localStorage.removeItem('customer')
      window.dispatchEvent(new CustomEvent('customer:unauthorized'))
    }
    return Promise.reject(err)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  login:  (creds) => api.post('/auth/login', creds),
  signup: (data)  => api.post('/auth/signup', data),
  me:     ()      => api.get('/auth/me'),
  logout: ()      => api.post('/auth/logout'),
}

// ─── Customer Auth (storefront) ────────────────────────────────────────────────
// Uses storefrontClient (cookie-based, withCredentials: true).

export const customerAuthAPI = {
  firebaseLogin: (data) => storefrontClient.post('/auth/firebase/login', data),
  me:            ()     => storefrontClient.get('/auth/customer/me'),
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesAPI = {
  // Admin
  list:   (params = {}) => api.get('/products/admin/categories', { params }),
  create: (data)        => api.post('/products/admin/categories', data),
  update: (id, data)    => api.patch(`/products/admin/categories/${id}`, data),
  delete: (id)          => api.delete(`/products/admin/categories/${id}`),
  // Public (storefront)
  listPublic: () => storefrontClient.get('/products/categories'),
}

export const homepageCategoriesAPI = {
  list: () => api.get('/admin/categories'),
  create: (formData) => api.post('/admin/categories', formData),
  update: (id, formData) => api.put(`/admin/categories/${id}`, formData),
  delete: (id) => api.delete(`/admin/categories/${id}`),
  listPublic: () => storefrontClient.get('/categories'),
}

// ─── Collections ──────────────────────────────────────────────────────────────

export const collectionsAPI = {
  // Admin
  list:   (params = {}) => api.get('/products/admin/collections', { params }),
  create: (data)        => api.post('/products/admin/collections', data),
  update: (id, data)    => api.patch(`/products/admin/collections/${id}`, data),
  delete: (id)          => api.delete(`/products/admin/collections/${id}`),
  // Public
  listPublic: (params = {}) => storefrontClient.get('/products/collections', { params }),
}



// ─── Custom Categories (Custom Printing domain — separate from products.categories) ──
// These endpoints ONLY manage the custom_categories table.
// Never use categoriesAPI here — that belongs to Standard Products.

export const customCategoriesAPI = {
  // Public endpoint — active custom categories for storefront
  list: () => api.get('/custom-products/categories'),
  // Admin endpoint — all custom categories (all statuses)
  listAdmin: (params = {}) => api.get('/custom-products/admin/categories', { params }),
  create: (data) => api.post('/custom-products/admin/categories', data),
  update: (id, data) => api.patch(`/custom-products/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/custom-products/admin/categories/${id}`),
}


// ─── Products ─────────────────────────────────────────────────────────────────

export const productsAPI = {

  adminList: (params) => {
    // Strip empty-string / null / undefined so FastAPI enum validation doesn't choke
    const cleaned = {}
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value !== null && value !== undefined) {
        cleaned[key] = value
      }
    }
    return api.get('/products/admin/all', { params: cleaned })
  },

  get:    (id)       => api.get(`/products/admin/${id}`),
  create: (data)     => api.post('/products/admin', data),
  update: (id, data) => api.patch(`/products/admin/${id}`, data),
  delete: (id)       => api.delete(`/products/admin/${id}`),

  // ── Bulk actions ────────────────────────────────────────────────────────────

  bulkAction: (payload) => api.post('/products/admin/bulk-action', payload),
  // payload: { product_ids: [...], action: 'publish'|'unpublish'|'archive'|'delete'|'move_category'|'move_collection',
  //            category_id?, collection_id? }

  // ── Variants ────────────────────────────────────────────────────────────────

  createVariant: (productId, data) =>
    api.post(`/products/admin/${productId}/variants`, data),

  deleteVariant: (productId, variantId) =>
    api.delete(`/products/admin/${productId}/variants/${variantId}`),

  // Caller passes { variants: [...] } — matches backend expectation explicitly
  bulkCreateVariants: (productId, variantsPayload) =>
    api.post(`/products/admin/${productId}/variants/bulk`, variantsPayload),

  /**
   * Update an existing variant (partial — only send changed fields).
   * @param {number} productId
   * @param {number} variantId
   * @param {object} data
   */
  updateVariant: (productId, variantId, data) =>
    api.patch(`/products/admin/${productId}/variants/${variantId}`, data),

  // ── Images ──────────────────────────────────────────────────────────────────

  /**
   * Upload an image for a product.
   * @param {number} productId
   * @param {File}   file
   * @param {string} imageType    - 'thumbnail' | 'gallery' | 'mockup' etc.
   * @param {boolean} setAsPrimary - explicitly control primary flag instead of
   *                                 hard-coding based on type.
   */
  uploadImage: (productId, file, imageType = 'thumbnail', setAsPrimary = true) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('image_type', imageType)
    formData.append('set_as_primary', String(setAsPrimary))
    return api.post(`/products/admin/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Delete a named image from a product by type.
   * @param {number} productId
   * @param {string} imageType - 'thumbnail' | 'front' | 'back' | 'size_chart'
   */
  deleteImage: (productId, imageType = 'thumbnail') =>
    api.delete(`/products/admin/${productId}/images/${imageType}`),

  /**
   * Delete a gallery image by product + gallery index.
   * @param {number} productId
   * @param {number} index
   */
  deleteGalleryImage: (productId, index) =>
    api.delete(`/products/admin/${productId}/images/gallery/${index}`),
}

// ─── Storefront Client ────────────────────────────────────────────────────────

export const storefrontAPI = {
  getProducts:      (params = {}) => storefrontClient.get('/products/', { params }),
  getProductBySlug: (slug)        => storefrontClient.get(`/products/slug/${slug}`),
  getRelated:       (slug, limit = 6) => storefrontClient.get(`/products/slug/${slug}/related`, { params: { limit } }),
  getCategories:    ()            => storefrontClient.get('/products/categories'),
  getHomepageCategories: ()       => storefrontClient.get('/categories'),
  getCollections:   (params = {}) => storefrontClient.get('/products/collections', { params }),
  getBanners:       ()            => storefrontClient.get('/banners/active/all'),
  getOffers:        ()            => storefrontClient.get('/offers/active/all'),
  getCustomProducts: (params = {}) =>
    storefrontClient.get('/custom-products', { params }),

  getCustomProduct: (id) =>
      storefrontClient.get(`/custom-products/${id}`),

  getPublicSettings: () => storefrontClient.get('/settings/public'),

  // ── Customer profile ──────────────────────────────────────────────────────
  updateProfile:    (data)        => storefrontClient.put('/customers/profile/update', data),
  
  contact: (data) => storefrontClient.post("/contact", data),
  // ── Customer orders ───────────────────────────────────────────────────────
  createOrder:      (data)        => storefrontClient.post('/orders/customer', data),
  getOrders:        ()            => storefrontClient.get('/orders/customer/all'),
  getOrder:         (id)          => storefrontClient.get(`/orders/customer/${id}`),
  cancelOrder:      (id)          => storefrontClient.post(`/orders/customer/${id}/cancel`),
  trackOrder:       (orderNumber) => storefrontClient.get(`/orders/track/${orderNumber}`),
}

export const customProductsAPI = {
  adminList: (params = {}) => {
    const cleaned = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) cleaned[k] = v
    })
    return api.get('/custom-products/admin/all', { params: cleaned })
  },

  get:    (id)       => api.get(`/custom-products/admin/${id}`),
  create: (data)     => api.post('/custom-products/admin', data),
  update: (id, data) => api.patch(`/custom-products/admin/${id}`, data),
  delete: (id)       => api.delete(`/custom-products/admin/${id}`),

  // Bulk actions — mirrors productsAPI.bulkAction shape
  bulkAction: (payload) => api.post('/custom-products/admin/bulk-action', payload),
  // payload: { product_ids: [...], action: 'publish'|'unpublish'|'archive'|'delete'|'move_category',
  //            custom_category_id? }

  uploadImage: (productId, file, imageType = 'thumbnail', setAsPrimary = false) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('image_type', imageType)
    formData.append('set_as_primary', String(setAsPrimary))
    return api.post(`/custom-products/admin/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteImage: (productId, imageType) =>
    api.delete(`/custom-products/admin/${productId}/images/${imageType}`),

  deleteGalleryImage: (productId, index) =>
    api.delete(`/custom-products/admin/${productId}/images/gallery/${index}`),
}
// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersAPI = {
  list:        (params = {}) => api.get('/orders/', { params }),
  get:         (id)          => api.get(`/orders/${id}`),
  update:      (id, data)    => api.put(`/orders/${id}`, data),
  cancel:      (id)          => api.post(`/orders/${id}/cancel`),
  updateTracking: (id, trackingStatus) =>
    api.put(`/orders/${id}/tracking`, null, { params: { tracking_status: trackingStatus } }),
}

// ─── Customers ────────────────────────────────────────────────────────────────

export const customersAPI = {
  list:        (params = {}) => api.get('/customers/', { params }),
  get:         (id)           => api.get(`/customers/${id}`),
  getProfile:  (id)           => api.get(`/customers/${id}/profile`),
  profile:     (id)           => api.get(`/customers/${id}/profile`),
  create:      (data)         => api.post('/customers/', data),
  update:      (id, data)     => api.put(`/customers/${id}`, data),
  updateStatus: (id, isActive) => api.patch(`/customers/${id}/status`, { is_active: isActive }),
  setStatus:   (id, isActive) => api.patch(`/customers/${id}/status`, { is_active: isActive }),
  updateNotes:  (id, notes)    => api.patch(`/customers/${id}/notes`, { notes }),
  updateTags:   (id, tags)     => api.patch(`/customers/${id}/tags`, { tags }),
  analytics:    ()             => api.get('/customers/analytics'),
  // Note: there is no DELETE /customers/{id} on the backend — customers are
  // deactivated via updateStatus(id, false), not deleted.
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  chartData: () => api.get('/dashboard/chart-data'),

  salesChart: (period, anchorDate) =>
    api.get('/dashboard/sales-chart', {
      params: {
        period,
        anchor_date: anchorDate,
      },
    }),

  recentActivity: () => api.get('/dashboard/recent-activity'),

  // ── Contact Messages ────────────────────────────────────────────────────────

  getContactMessages: (params = {}) => api.get('/contact', { params }),
  getContactMessage: (id) => api.get(`/contact/${id}`),
  replyToContactMessage: (id, data) => api.post(`/contact/${id}/reply`, data),
  updateContactMessageStatus: (id, status) => api.put(`/contact/${id}`, { status }),
  deleteContactMessage: (id) => api.delete(`/contact/${id}`),
  getContactStats: () => api.get('/contact/admin/stats'),
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export const offersAPI = {
  list:       ()         => api.get('/offers/admin/all'),
  get:        (id)       => api.get(`/offers/admin/${id}`),
  create:     (formData) => api.post('/offers/admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:     (id, data) => api.patch(`/offers/admin/${id}`, data),
  updateFull: (id, data) => api.put(`/offers/admin/${id}`, data),
  delete:     (id)       => api.delete(`/offers/admin/${id}`),
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export const bannersAPI = {
  list:       ()         => api.get('/banners/admin/all'),
  get:        (id)       => api.get(`/banners/admin/${id}`),
  create:     (formData) => api.post('/banners/admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:     (id, data) => api.patch(`/banners/admin/${id}`, data),
  toggle:     (id)       => api.put(`/banners/admin/${id}/toggle`),
  delete:     (id)       => api.delete(`/banners/admin/${id}`),
  listActive: ()         => api.get('/banners/active/all'),
}

export const adminsAPI = {
  list:   ()        => api.get('/admins/'),
  get:    (id)       => api.get(`/admins/${id}`),
  create: (data)     => api.post('/admins/', data),
  update: (id, data) => api.put(`/admins/${id}`, data),
  delete: (id)        => api.delete(`/admins/${id}`),
  count:  ()          => api.get('/admins/count'),
}

export const routesAPI = {
  search: (q) => api.get('/admin/routes/search', { params: { q } }),
}

