import React from 'react'
import ProductsList from '@/storefront/components/product/ProductList'

export default function OffersPage() {
  return <ProductsList defaultFilters={{ on_offer: true }} />
}