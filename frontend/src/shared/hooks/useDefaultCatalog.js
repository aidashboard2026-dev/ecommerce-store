import { useQuery } from '@tanstack/react-query'
import settingsService from '@/admin/services/settingsService'

export function useDefaultCatalog() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['defaultCatalog'],
    queryFn: async () => {
      const response = await settingsService.getDefaultCatalog()
      return response.data
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  return {
    catalog: data ?? null,
    isLoading,
    error,
    refetch,
  }
}

export default useDefaultCatalog
