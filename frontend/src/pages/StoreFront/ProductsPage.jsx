import React from 'react'
import { useParams } from 'react-router-dom'
import ProductsList from '../../components/storefront/ProductsList'
import ProductDetails from '../../components/storefront/ProductDetails'

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
