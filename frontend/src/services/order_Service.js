import api from "./api";

export const getOrders = async () => {
  const response = await api.get("/orders/?skip=0&limit=10000");
  return response.data;
};

export const updateOrderStatus = async (
  orderId,
  status
) => {
  const response = await api.put(
    `/orders/${orderId}`,
    {
      tracking_status: status,
    }
  );

  return response.data;
};

export const updateOrder = async (orderId, data) => {
  const response = await api.put(`/orders/${orderId}`, data);
  return response.data;
};