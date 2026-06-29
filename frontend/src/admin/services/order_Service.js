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
  const cleanFilters = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) {
      cleanFilters[k] = v;
    }
  });

  const response = await api.get("/orders/", {
    params: {
      page,
      per_page: pageSize,
      ...cleanFilters,
    },
  });

  const data = response.data;

  return {
    orders: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? page),
    page_size: Number(data?.page_size ?? pageSize),
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
