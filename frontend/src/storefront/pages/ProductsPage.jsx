import React from 'react'
import { useParams } from 'react-router-dom'
import ProductsList from '@/storefront/components/ProductsList'
import ProductDetails from '@/storefront/components/ProductDetails'

// Consolidated storefront products page.
//
// Handles both listing and detail views internally via conditional
// rendering based on the route param, so a single page component backs
// both /products and /products/:slug (mirrors the pattern used by
// OrdersPage for /orders and /orders/:id).
export default function ProductsPage() {
  const { slug } = useParams()

  return slug ? <ProductDetails /> : <ProductsList />
}
