import { storefrontAPI } from '@/shared/services/api'

export const createOrder = (data) => storefrontAPI.createOrder(data).then((r) => r.data)

export const fetchMyOrders = () => storefrontAPI.getOrders().then((r) => r.data)

export const fetchMyOrder = (id) => storefrontAPI.getOrder(id).then((r) => r.data)

export const cancelMyOrder = (id) => storefrontAPI.cancelOrder(id).then((r) => r.data)

export const trackOrder = (orderNumber) => storefrontAPI.trackOrder(orderNumber).then((r) => r.data)

export const createRazorpayOrder = (data) => storefrontAPI.createRazorpayOrder(data).then((r) => r.data)

export const verifyRazorpayPayment = (data) => storefrontAPI.verifyRazorpayPayment(data).then((r) => r.data)
