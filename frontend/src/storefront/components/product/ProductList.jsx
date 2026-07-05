import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useProductsInfinite, useCollections, useCategories } from '@/storefront/hooks/useProducts'

import ProductGrid from '@/storefront/components/home/ProductGrid'
import ProductFilters from '@/storefront/components/product/ProductFilters'
import { useDebounce } from '@/shared/utils/productUtils'
import SortDropdown from "@/storefront/components/filters/SortDropdown";
import FilterDrawer from "@/storefront/components/filters/FilterDrawer";
import { useLocation } from "react-router-dom";
  const DEFAULT_FILTERS={
      sort_by:"newest",
      collection_id:"",
      category_id:"",
      category:"",
      collection:"",
      gender:"",
      min_price:"",
      max_price:"",
      rating:null,
      in_stock_only:false
  }
export default function ProductsList({ forcedFilters = {}, title = 'Shop Catalog' } = {}) {
  const location = useLocation();

  const fromMenu = location.state?.fromMenu === true;
  const [searchParams, setSearchParams] = useSearchParams()
  

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 400)
  const [drawerOpen,setDrawerOpen]=useState(false);

  const [filters, setFilters] = useState({
    sort_by: searchParams.get('sort_by') || 'newest',
    collection_id: searchParams.get('collection_id') || '',
    category_id: searchParams.get('category_id') || '',
    category: searchParams.get('category') || '',
    collection: searchParams.get('collection') || '',
    gender: searchParams.get('gender') || '',
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

  const queryFilters = useMemo(() => {
    const f = {
      sort_by: filters.sort_by,
      search: debouncedSearch || undefined,
      collection_id: filters.collection_id || undefined,
      category_id: filters.category_id || undefined,
      category:
        filters.category_id
            ? categories.find(
                  c => String(c.id) === String(filters.category_id)
              )?.slug
            : filters.category || undefined,
      collection: filters.collection || undefined,
      genders: filters.gender ? [filters.gender] : undefined,
      min_price: filters.min_price || undefined,
      max_price: filters.max_price || undefined,
      ...forcedFilters,
    }
    return f
  }, [filters, debouncedSearch, forcedFilters])

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
    
    if (filters.gender) params.gender = filters.gender
    
    if (filters.category_id) {
      const catObj = categories.find(c => String(c.id) === String(filters.category_id))
      console.log("Matched Category", catObj);
      if (catObj) params.category = catObj.slug
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
   }, [
    debouncedSearch,
    filters,
    collections,
    categories,
  ]);

  // Sync URL params -> State (handles nav clicks & back button)
  useEffect(() => {
    setFilters((prev) => {
      const newSort = searchParams.get('sort_by') || 'newest'
      const newCol = searchParams.get('collection') || ''
      const newGender = searchParams.get('gender') || ''
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
        const catObj = categories.find(
          (c) =>
            c.slug?.toLowerCase() === newCat.toLowerCase() ||
            c.name?.toLowerCase() === newCat.toLowerCase()
        );
        if (catObj) newCatId = String(catObj.id)
      }

      if (
        prev.sort_by === newSort &&
        prev.collection_id === newColId &&
        prev.collection === newCol &&
        prev.gender === newGender &&
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
        gender: newGender,
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

 const products = useMemo(() => {

   if(!data?.pages) return [];

   const all=[];

   for(const page of data.pages){
      all.push(...page.items);
   }

   if(!filters.in_stock_only){
      return all;
   }

   return all.filter(
      p=>(p.total_stock??0)>0
   );

},[
   data?.pages,
   filters.in_stock_only
]);
  
  const handleReset = () => {
    setSearch("");

    setFilters((prev) => ({
      ...prev,
      sort_by: "newest",
      min_price: "",
      max_price: "",
      rating: null,
      in_stock_only: false,
    }));
  };

  // const handleReset = () => {

  //   if(
  //       !hasActiveFilters
  //   ){
  //       return;
  //   }

  //   setSearch("");

  //   setFilters({
  //       ...DEFAULT_FILTERS,
  //       category: "",
  //       category_id: "",
  //       collection: "",
  //       collection_id: "",
  //   });

  //   setSearchParams(
  //       {},
  //       {
  //         replace:true
  //       }
  //   );

  // }
  const hasActiveFilters = useMemo(() => {
    const drawerFilters =
      filters.sort_by !== "newest" ||
      filters.min_price !== "" ||
      filters.max_price !== "" ||
      filters.in_stock_only;

    return (
      drawerFilters ||
      search.trim() !== ""
    );
  }, [
    filters.sort_by,
    filters.min_price,
    filters.max_price,
    filters.in_stock_only,
    search,
  ]);

  const pageTitle = useMemo(() => {
      if (!filters.category) return title;

      const cat = categories.find(
          (c) =>
              c.slug?.toLowerCase() === filters.category.toLowerCase()
      );

      if (!cat) return title;

      const gender = filters.gender || "";

      return gender
          ? `${cat.name} For ${gender}`
          : cat.name;
  }, [categories, filters.category, filters.gender, title]);

  useEffect(() => {
     
  }, [filters, categories, queryFilters]);
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-black">
            {pageTitle}
        </h1>
        <p className="text-sm text-muted">
            {products.length > 0
                ? `${products.length} Products Available`
                : `Browse ${pageTitle}`}
        </p>
      </div>

      {/* Search + mobile filter trigger */}

      <div className="mb-8 flex items-center justify-between border-y border-[#d9d9d9]">

      {/* Left Side */}
      <div className="flex flex-1 items-center px-5 py-2">

        {/* Search
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="
            h-[42px]
            w-[650px]
            border
            border-[#d9d9d9]
            bg-white
            px-4
            text-[14px]
            outline-none
            focus:border-black
          "
        /> */}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="
              ml-4
              h-[42px]
              whitespace-nowrap
              border
              border-[#d9d9d9]
              px-5
              text-[12px]
              uppercase
              tracking-[2px]
              text-red-600
              transition
              hover:bg-[#f5f5f5]
            "
          >
            Clear Filters
          </button>
        )}

      </div>

      {/* Right Side */}
      <div className="flex h-[58px]">

        <SortDropdown
          value={filters.sort_by}
          onChange={(value)=>{

            if(value===filters.sort_by){
                return;
            }

            setFilters(prev=>({
                ...prev,
                sort_by:value
            }));

          }}
        />

        <button
          onClick={()=>{
            if(!drawerOpen){
                setDrawerOpen(true);
            }
          }}
          className="
            flex
            w-[140px]
            items-center
            justify-center
            gap-3
            border-l
            border-[#d9d9d9]
            text-[12px]
            uppercase
            tracking-[3px]
            transition
            hover:bg-[#f7f7f7]
          "
        >
          <SlidersHorizontal size={16} />
          Filter
        </button>

      </div>

    </div>
      

      {/* Sort + Filter

      <div className="mb-8 flex items-center justify-end border-y border-[#d9d9d9] h-[58px]">

        <SortDropdown
          value={filters.sort_by}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              sort_by: value,
            }))
          }
        />

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-full w-[140px] items-center justify-center gap-3 border-l border-[#d9d9d9] text-[12px] uppercase tracking-[3px] hover:bg-[#f8f8f8] transition"
        >
          <SlidersHorizontal size={16} />
          Filter
        </button>

      </div> */}

        <FilterDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            filters={filters}
            setFilters={setFilters}
        />
    
        <div className="flex-1">
          <ProductGrid products={products} loading={isLoading || isFetchingNextPage} />
          <div ref={sentinelRef} className="h-1" />
        </div>
     
      
    </div>
  )
}
