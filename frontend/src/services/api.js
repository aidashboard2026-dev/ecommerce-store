import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'


console.log("BASE URL =", BASE_URL);
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
      localStorage.removeItem('token')
      localStorage.removeItem('admin')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: ({ email, password }) => {
    console.log("LOGIN REQUEST =", {
      email,
      password,
    });

    return api.post("/auth/login", {
      email,
      password,
    });
  },

  getMe: () => api.get("/auth/me"),

  logout: () => api.post("/auth/logout"),
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
  setStatus:   (id, is_active) => api.patch(`/customers/${id}/status`, { is_active }),
  updateNotes: (id, notes)   => api.patch(`/customers/${id}/notes`, { notes }),
  updateTags:  (id, tags)    => api.patch(`/customers/${id}/tags`, { tags }),
  analytics:   ()            => api.get('/customers/analytics'),
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  adminList: (params) => {
    const cleaned = {}
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value != null) cleaned[key] = value
    }
    return api.get('/products/admin/all', { params: cleaned })
  },
  get:             (id)              => api.get(`/products/admin/${id}`),
  create:          (data)            => api.post('/products/admin', data),
  update:          (id, data)        => api.patch(`/products/admin/${id}`, data),
  delete:          (id)              => api.delete(`/products/admin/${id}`),
  createVariant:   (productId, data) => api.post(`/products/admin/${productId}/variants`, data),
  uploadImage:     (productId, formData) =>
    api.post(`/products/admin/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProductImage: (productId) => api.delete(`/products/admin/images/${productId}`),
  deleteImage:        (productId) => api.delete(`/products/admin/images/${productId}`),
}

export default api
