import React from 'react'
import ProductList from '@/storefront/components/product/ProductList'

// "On offer" here means currently-discounted products (backend computes this
// per-product as any variant with selling_price < original_price — see
// get_products_public's on_offer handling in products/service.py). This is
// unrelated to the separate store-wide promotional-banner Offer model (see
// OfferCard.jsx), which has no product relationship and is surfaced on the
// homepage banner strip instead.
const ON_OFFER_FILTER = { on_offer: true }

export default function OffersPage() {
  return <ProductList forcedFilters={ON_OFFER_FILTER} title="On Offer" />
}