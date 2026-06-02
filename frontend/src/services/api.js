import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
console.log("BASE_URL =", BASE_URL)

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401s globally
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
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

export const adminsAPI = {
  list: (skip = 0, limit = 100) => api.get(`/admins/?skip=${skip}&limit=${limit}`),
  count: () => api.get('/admins/count'),
  get: (id) => api.get(`/admins/${id}`),
  create: (data) => api.post('/admins/', data),
  update: (id, data) => api.put(`/admins/${id}`, data),
  delete: (id) => api.delete(`/admins/${id}`),
}

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  chartData: () => api.get('/dashboard/chart-data'),
  recentActivity: () => api.get('/dashboard/recent-activity'),
}

export default api
