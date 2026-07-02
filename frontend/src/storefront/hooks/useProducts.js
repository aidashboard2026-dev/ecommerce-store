/**
 * src/hooks/useProducts.js
 * React Query hooks for storefront products, categories, and collections.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { storefrontAPI } from '@/shared/services/api'

const PER_PAGE = 12

// ─── Storefront product listing ───────────────────────────────────────────────

export function useProductsInfinite(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: ({ pageParam = 1 }) =>
      storefrontAPI.getProducts({ ...filters, page: pageParam, per_page: PER_PAGE })
        .then(r => r.data),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60_000,
  })
}

export function useProductBySlug(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => storefrontAPI.getProductBySlug(slug).then(r => r.data),
    enabled: !!slug,
    staleTime: 60_000,
  })
}

export function useRelatedProducts(slug, limit = 6) {
  return useQuery({
    queryKey: ['product', slug, 'related', limit],
    queryFn: () => storefrontAPI.getRelated(slug, limit).then(r => r.data),
    enabled: !!slug,
    staleTime: 60_000,
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => storefrontAPI.getProducts({ page: 1, per_page: 8, is_featured: true }).then(r => r.data),
    staleTime: 60_000,
    select: (data) => data.items.slice(0, 8),
  })
}

export function useNewArrivals() {
  return useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: () =>
      storefrontAPI.getProducts({ page: 1, per_page: 8, is_new_arrival: true, sort_by: 'newest' })
        .then(r => r.data),
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

export function useTrendingProducts() {
  return useQuery({
    queryKey: ['products', 'trending'],
    queryFn: () =>
      storefrontAPI.getProducts({ page: 1, per_page: 8, is_trending: true }).then(r => r.data),
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

export function useBestSellers() {
  return useQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: () =>
      storefrontAPI.getProducts({ page: 1, per_page: 8, is_best_seller: true }).then(r => r.data),
    staleTime: 60_000,
    select: (data) => data.items.filter((p) => (p.total_stock ?? 0) > 0),
  })
}

// ─── Storefront categories ────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'public'],
    queryFn: () => storefrontAPI.getCategories().then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

export function useCollections(categoryId) {
  return useQuery({
    queryKey: ['collections', 'public', categoryId],
    queryFn: () =>
      storefrontAPI.getCollections(categoryId ? { category_id: categoryId } : {}).then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

// Legacy: derive distinct collection strings from product list (backward compat)
export function useCollectionNames() {
  return useQuery({
    queryKey: ['products', 'collection-names'],
    queryFn: () => storefrontAPI.getProducts({ page: 1, per_page: 100 }).then(r => r.data),
    staleTime: 5 * 60_000,
    select: (data) => {
      const set = new Set()
      data.items.forEach((p) => { if (p.collection) set.add(p.collection) })
      return Array.from(set)
    },
  })
}

// ─── Offers / Banners ─────────────────────────────────────────────────────────

export function useActiveOffers() {
  return useQuery({
    queryKey: ['offers', 'active'],
    queryFn: () => storefrontAPI.getOffers ? storefrontAPI.getOffers().then(r => r.data) : Promise.resolve([]),
    staleTime: 60_000,
  })
}

export function useActiveBanners() {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: () => storefrontAPI.getBanners().then(r => r.data),
    staleTime: 60_000,
    retry: 1,
  })
}


export function useCustomProducts(filters = {}) {
  return useQuery({
    queryKey: ['custom-products', filters],
    queryFn: () =>
      storefrontAPI.getCustomProducts(filters).then((r) => r.data),
    staleTime: 60_000,
  })
}

export function useCustomProduct(id) {
  return useQuery({
    queryKey: ['custom-product', id],
    queryFn: () =>
      storefrontAPI.getCustomProduct(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 60_000,
  })
}