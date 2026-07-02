import api from '@/shared/services/api'

export const settingsService = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  updateProfile: (data) => api.put('/settings/profile', data),
  updateSecurity: (data) => api.put('/settings/security', data),
  updatePassword: (data) => api.put('/settings/password', data),
  getPayments: () => api.get('/settings/payments'),
  updatePayment: (id, data) => api.put(`/settings/payments/${id}`, data),
  getNotifications: () => api.get('/settings/notifications'),
  updateNotification: (id, data) => api.put(`/settings/notifications/${id}`, data),
  uploadLogo: (formData) => api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteLogo: () => api.delete('/settings/logo'),
  getBusinessLimits: () => api.get('/settings/business-limits'),
  getDefaultCatalog: () => api.get('/settings/default-catalog'),
  getRegionalOptions: () => api.get('/settings/regional-options'),
}

export default settingsService

