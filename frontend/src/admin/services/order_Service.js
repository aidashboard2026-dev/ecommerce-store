import api from "@/shared/services/api";

/**
 * Fetch orders from the admin API with server-side pagination.
 *
 * @param {number} page     - 1-based page number (default 1)
 * @param {number} pageSize - rows per page (default 20)
 * @param {object} filters  - optional extra query params (e.g. { tracking_status: 'PLACED' })
 * @returns {{ orders: Order[], total: number, page: number, page_size: number }}
 */
export const getOrders = async (page = 1, pageSize = 20, filters = {}) => {
  const skip = (page - 1) * pageSize;

  // Remove empty/null filters so FastAPI enum validators don't reject them
  const cleanFilters = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) {
      cleanFilters[k] = v;
    }
  });

  const response = await api.get("/orders/", {
    params: { skip, limit: pageSize, ...cleanFilters },
  });

  // Backend returns { orders: [...], total: n } — normalise so callers
  // always get a consistent shape even if the backend shape changes.
  const data = response.data;
  return {
    orders:    Array.isArray(data) ? data : (data.orders ?? []),
    total:     data.total ?? (Array.isArray(data) ? data.length : 0),
    page,
    page_size: pageSize,
  };
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await api.put(`/orders/${orderId}`, {
    tracking_status: status,
  });
  return response.data;
};

export const updateOrder = async (orderId, data) => {
  const response = await api.put(`/orders/${orderId}`, data);
  return response.data;
};
