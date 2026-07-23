import api from "@/shared/services/api";

/**
 * Fetch orders with pagination + dashboard stats
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

    // Backend returns per_page, not page_size
    page_size: Number(data?.per_page ?? pageSize),

    totalPages: Number(data?.total_pages ?? 1),

    // ⭐ THIS WAS MISSING
    stats: data?.stats ?? {
      total_orders: 0,
      new_orders: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    },
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