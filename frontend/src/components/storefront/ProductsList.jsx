import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useProductsInfinite, useCollections, useCategories } from '../../hooks/useProducts'
import ProductGrid from './ProductGrid'
import ProductFilters from './ProductFilters'
import { useDebounce } from '../../utils/productUtils'

export default function ProductsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 400)

  const [filters, setFilters] = useState({
    sort_by: searchParams.get('sort_by') || 'newest',
    collection_id: searchParams.get('collection_id') || '',
    category_id: searchParams.get('category_id') || '',
    category: searchParams.get('category') || '',
    collection: searchParams.get('collection') || '',
    sub_collection: searchParams.get('sub_collection') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    rating: null,
    in_stock_only: false,
  })

  const { data: collections = [] } = useCollections()
  const { data: categoriesData = [] } = useCategories()

  const categories = useMemo(() => {
    return categoriesData.filter(c => c.name !== "Custom Printing")
  }, [categoriesData])

  const subCollections = useMemo(() => [
    'Casual',
    'Essentials',
    'Premium',
    'Sports',
    'Oversized',
    'Printed',
    'Lifestyle',
    'Summer',
    'Winter'
  ], [])

  const queryFilters = useMemo(() => {
    const f = {
      sort_by: filters.sort_by,
      search: debouncedSearch || undefined,
      collection_id: filters.collection_id || undefined,
      category_id: filters.category_id || undefined,
      category: filters.category || undefined,
      collection: filters.collection || undefined,
      sub_collection: filters.sub_collection || undefined,
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
    
    if (filters.collection_id) {
      const colObj = collections.find(c => String(c.id) === String(filters.collection_id))
      if (colObj) params.collection = colObj.name
    } else if (filters.collection) {
      params.collection = filters.collection
    }
    
    if (filters.sub_collection) params.sub_collection = filters.sub_collection
    
    if (filters.category_id) {
      const catObj = categories.find(c => String(c.id) === String(filters.category_id))
      if (catObj) params.category = catObj.name
    } else if (filters.category) {
      params.category = filters.category
    }

    if (filters.sort_by !== 'newest') params.sort_by = filters.sort_by
    if (filters.min_price) params.min_price = filters.min_price
    if (filters.max_price) params.max_price = filters.max_price

    const currentParams = Object.fromEntries(searchParams.entries())
    const hasChanged = Object.keys(params).length !== Object.keys(currentParams).length ||
      Object.keys(params).some(k => String(params[k]) !== String(currentParams[k]))

    if (hasChanged) {
      setSearchParams(params, { replace: true })
    }
  }, [debouncedSearch, filters, collections, categories, searchParams, setSearchParams])

  // Sync URL params -> State (handles nav clicks & back button)
  useEffect(() => {
    setFilters((prev) => {
      const newSort = searchParams.get('sort_by') || 'newest'
      const newCol = searchParams.get('collection') || ''
      const newSubCol = searchParams.get('sub_collection') || ''
      const newCat = searchParams.get('category') || ''
      const newMin = searchParams.get('min_price') || ''
      const newMax = searchParams.get('max_price') || ''

      let newColId = ''
      if (newCol && collections.length > 0) {
        const colObj = collections.find(c => c.name.toLowerCase() === newCol.toLowerCase())
        if (colObj) newColId = String(colObj.id)
      }

      let newCatId = ''
      if (newCat && categories.length > 0) {
        const catObj = categories.find(c => c.name.toLowerCase() === newCat.toLowerCase())
        if (catObj) newCatId = String(catObj.id)
      }

      if (
        prev.sort_by === newSort &&
        prev.collection_id === newColId &&
        prev.collection === newCol &&
        prev.sub_collection === newSubCol &&
        prev.category_id === newCatId &&
        prev.category === newCat &&
        prev.min_price === newMin &&
        prev.max_price === newMax
      ) {
        return prev
      }

      return {
        ...prev,
        sort_by: newSort,
        collection_id: newColId,
        collection: newCol,
        sub_collection: newSubCol,
        category_id: newCatId,
        category: newCat,
        min_price: newMin,
        max_price: newMax,
      }
    })

    const newSearch = searchParams.get('search') || ''
    if (search !== newSearch) {
      setSearch(newSearch)
    }
  }, [searchParams, collections, categories])

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
      collection_id: '',
      category_id: '',
      category: '',
      collection: '',
      sub_collection: '',
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
          categories={categories}
          subCollections={subCollections}
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
