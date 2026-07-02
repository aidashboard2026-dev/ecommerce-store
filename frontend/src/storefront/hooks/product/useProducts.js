import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchProducts,
  fetchProductBySlug,
  fetchOffers,
  fetchBanners,
} from '@/storefront/services/productsService'

const PER_PAGE = 12

// Infinite scroll product listing
export function useProductsInfinite(filters) {
  return useInfiniteQuery({
    queryKey: ["products", filters],

    queryFn: ({ pageParam = 1 }) =>
      storefrontAPI
        .getProducts({
          ...filters,
          page: pageParam,
          per_page: PER_PAGE,
        })
        .then((r) => r.data),

    initialPageParam: 1,

    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,

    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    placeholderData: (previousData) => previousData,
  })
}

export function useProductBySlug(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProductBySlug(slug),
    enabled: !!slug,
    staleTime: 60_000,
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => fetchProducts({ page: 1, per_page: 8, sort_by: 'newest' }),
    staleTime: 60_000,
    select: (data) => data.items.filter((p) => p.is_featured).slice(0, 8),
  })
}

export function useNewArrivals() {
  return useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: () => fetchProducts({ page: 1, per_page: 8, sort_by: 'newest' }),
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

export function useBestSellers() {
  // No sales-count field exposed by the API yet; approximate "best sellers"
  // with the lowest-priced in-stock items as a stand-in ranking signal.
  return useQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: () => fetchProducts({ page: 1, per_page: 8, sort_by: 'price_asc' }),
    staleTime: 60_000,
    select: (data) => data.items.filter((p) => (p.total_stock ?? 0) > 0),
  })
}

export function useActiveOffers() {
  return useQuery({
    queryKey: ['offers', 'active'],
    queryFn: fetchOffers,
    staleTime: 60_000,
  })
}

export function useActiveBanners() {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: fetchBanners,
    staleTime: 60_000,
    retry: 1,
  })
}

// Derive a list of distinct collections from a products page (used for filters)
export function useCollections() {
  return useQuery({
    queryKey: ['products', 'collections'],
    queryFn: () => fetchProducts({ page: 1, per_page: 100 }),
    staleTime: 5 * 60_000,
    select: (data) => {
      const set = new Set()
      data.items.forEach((p) => {
        if (p.collection) set.add(p.collection)
      })
      return Array.from(set)
    },
  })
}

export function useCustomProducts(filters = {}) {
  return useQuery({
    queryKey: ['custom-products', filters],
    queryFn: () => fetchCustomProducts(filters),
    staleTime: 60_000,
  })
}

export function useCustomProduct(id) {
  return useQuery({
    queryKey: ['custom-product', id],
    queryFn: () => fetchCustomProduct(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}