import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ShoppingBag } from 'lucide-react'
import { CartItem, CartSummary } from '@/storefront/components/shoppingcart'
import { PageContainer } from '@/shared/components/layout'

export default function CartPage() {
  const items = useSelector((s) => s.cart.items)

  if (items.length === 0) {
    return (
      <PageContainer className="flex flex-col items-center gap-4 py-20 text-center">
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
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <h1 className="mb-8 font-display text-2xl font-bold text-app sm:text-3xl lg:text-4xl">Shopping Cart</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-8">
        <div className="rounded-md border border-app bg-app p-3 sm:p-5">
          {items.map((item) => (
            <CartItem key={`${item.productId}-${item.size}-${item.color}`} item={item} />
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary />
        </div>
      </div>
    </PageContainer>
  )
}
