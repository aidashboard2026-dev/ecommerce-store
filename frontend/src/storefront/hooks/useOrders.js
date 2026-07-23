import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrder,
  fetchMyOrders,
  fetchMyOrder,
  cancelMyOrder,
  trackOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '@/storefront/services/ordersService'

export function useMyOrders(enabled = true) {
  return useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: fetchMyOrders,
    enabled,
    staleTime: 30_000,
  })
}

export function useMyOrder(id) {
  return useQuery({
    queryKey: ['orders', 'mine', id],
    queryFn: () => fetchMyOrder(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelMyOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] })
    },
  })
}

export function useTrackOrder(orderNumber) {
  return useQuery({
    queryKey: ['orders', 'track', orderNumber],
    queryFn: () => trackOrder(orderNumber),
    enabled: !!orderNumber,
    retry: false,
  })
}

export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: createRazorpayOrder,
  })
}

export function useVerifyRazorpayPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: verifyRazorpayPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] })
    },
  })
}
