import { useQuery } from '@tanstack/react-query'
import { storefrontAPI } from '@/shared/services/api'

export function useStoreSettings() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['storeSettings'],
    queryFn: async () => {
      const response = await storefrontAPI.getPublicSettings()
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
    settings: data ?? null,
    isLoading,
    error,
    refetch,
  }
}

export default useStoreSettings
