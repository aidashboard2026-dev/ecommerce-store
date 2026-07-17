import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ShoppingBag } from 'lucide-react'
import { CartItem, CartSummary } from '@/storefront/components/shoppingcart'

export default function CartPage() {
  const items = useSelector((s) => s.cart.items)

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center">
          <ShoppingBag size={28} className="text-muted" />
        </div>
        <h1 className="font-display font-bold text-xl text-app">Your cart is empty</h1>
        <p className="text-sm text-muted max-w-sm">
          Looks like you haven't added anything yet. Explore our catalog and find something you love.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center justify-center bg-brand-900 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-glow-sm transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-app mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-app border border-app rounded-2xl p-4 sm:p-6">
          {items.map((item) => (
            <CartItem key={`${item.productId}-${item.size}-${item.color}`} item={item} />
          ))}
        </div>

        <div className="lg:col-span-1">
          <CartSummary />
        </div>
      </div>
    </div>
  )
}
