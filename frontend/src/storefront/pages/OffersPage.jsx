import React from 'react'
import ProductsList from '@/storefront/components/ProductsList'

export default function OffersPage() {
  return <ProductsList defaultFilters={{ on_offer: true }} />
}