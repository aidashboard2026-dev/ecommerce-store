import React from 'react'
import { useParams, useLocation } from 'react-router-dom'
import OrdersList from '../../components/storefront/OrdersList'
import OrderDetails from '../../components/storefront/OrderDetails'
import OrderSuccess from '../../components/storefront/OrderSuccess'
import OrderTrackingLookup from '../../components/storefront/OrderTrackingLookup'

// Consolidated storefront orders page.
//
// Internally handles every order-related view via conditional rendering
// based on the matched route, so a single page component backs:
//   /orders             -> OrdersList   (my orders)
//   /orders/:id         -> OrderDetails (single order, includes timeline)
//   /orders/:id/tracking-> OrderDetails (same view; tracking is already
//                                        shown inline via OrderTimeline)
//   /orders/success     -> OrderSuccess (new canonical path)
//   /payment            -> OrderSuccess (legacy path, preserved as-is so
//                                        the existing checkout flow's
//                                        navigate('/payment') keeps working)
//   /tracking           -> OrderTrackingLookup (guest order-number lookup,
//                                        preserved as its own public route)
//   /profile/orders     -> OrdersList   (embedded inside ProfilePage's
//                                        "Orders" tab — same component,
//                                        no id/success path matches here)
export default function OrdersPage() {
  const { id } = useParams()
  const location = useLocation()
  const path = location.pathname

  if (path === '/tracking') {
    return <OrderTrackingLookup />
  }

  if (path === '/payment' || path === '/orders/success') {
    return <OrderSuccess />
  }

  if (id) {
    return <OrderDetails />
  }

  return <OrdersList />
}
