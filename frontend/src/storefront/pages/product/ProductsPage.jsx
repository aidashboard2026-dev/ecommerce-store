import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useProductsInfinite, useCollections } from '@/storefront/hooks/product/useProducts'
import ProductGrid from '@/storefront/components/product/components/ProductGrid'
import ProductFilters from '@/storefront/components/product/components/ProductFilters'
import { useDebounce } from '@/shared/utils/productUtils'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 400)

  const [filters, setFilters] = useState({
    sort_by: searchParams.get('sort_by') || 'newest',
    collection: searchParams.get('collection') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    rating: null,
    in_stock_only: false,
  })

  const { data: collections = [] } = useCollections()

  const queryFilters = useMemo(() => {
    const f = {
      sort_by: filters.sort_by,
      search: debouncedSearch || undefined,
      collection: filters.collection || undefined,
      min_price: filters.min_price || undefined,
      max_price: filters.max_price || undefined,
    }
    return f
  }, [filters, debouncedSearch])

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useProductsInfinite(queryFilters)

  // Sync URL params (shareable / back-button friendly)
  useEffect(() => {
    const params = {}
    if (debouncedSearch) params.search = debouncedSearch
    if (filters.collection) params.collection = filters.collection
    if (filters.sort_by !== 'newest') params.sort_by = filters.sort_by
    if (filters.min_price) params.min_price = filters.min_price
    if (filters.max_price) params.max_price = filters.max_price
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters])

  // Infinite scroll sentinel
  const sentinelRef = useRef(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  let products = useMemo(() => {
    const all = data?.pages?.flatMap((p) => p.items) || []
    return filters.in_stock_only ? all.filter((p) => (p.total_stock ?? 0) > 0) : all
  }, [data, filters.in_stock_only])

  const handleReset = () => {
    setSearch('')
    setFilters({
      sort_by: 'newest',
      collection: '',
      min_price: '',
      max_price: '',
      rating: null,
      in_stock_only: false,
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-app">Shop Catalog</h1>
        <p className="text-sm text-muted">
          {products.length > 0 ? `Showing ${products.length} products` : 'Browse our collection'}
        </p>
      </div>

      {/* Search + mobile filter trigger */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="flex-1 bg-surface border border-app rounded-full py-2.5 px-5 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
        />
        <button
          onClick={() => setFiltersOpen(true)}
          className="lg:hidden inline-flex items-center gap-2 border border-app rounded-full px-4 py-2.5 text-sm font-semibold text-app"
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      <div className="flex gap-8">
        <ProductFilters
          collections={collections}
          filters={filters}
          onChange={setFilters}
          onReset={handleReset}
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />

        <div className="flex-1">
          <ProductGrid products={products} loading={isLoading || isFetchingNextPage} />
          <div ref={sentinelRef} className="h-1" />
        </div>
      </div>
    </div>
  )
}
