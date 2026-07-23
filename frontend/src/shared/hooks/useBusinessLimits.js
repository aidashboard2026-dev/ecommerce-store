import { useQuery } from '@tanstack/react-query'
import settingsService from '@/admin/services/settingsService'

export function useBusinessLimits() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['businessLimits'],
    queryFn: async () => {
      const response = await settingsService.getBusinessLimits()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  return {
    limits: data ?? null,
    isLoading,
    error,
    refetch,
  }
}

export default useBusinessLimits