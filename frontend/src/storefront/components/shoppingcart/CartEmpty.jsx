import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'

export default function CartEmpty({ onStartShopping }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="h-16 w-16 rounded-full bg-surface border border-app flex items-center justify-center">
        <ShoppingBag size={28} className="text-muted" />
      </div>
      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg text-app">Your cart is empty</h3>
        <p className="text-sm text-muted max-w-xs">
          Explore the shop and add your favorites when you are ready.
        </p>
      </div>
      <Link
        to="/products"
        onClick={onStartShopping}
        className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-glow-sm transition-colors"
      >
        Start Shopping
      </Link>
    </div>
  )
}
