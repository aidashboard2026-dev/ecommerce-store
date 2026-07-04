import React from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Heart, X, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { getImageUrl, formatPrice } from '@/shared/utils/productUtils'
import { removeFromWishlist } from '@/storefront/store/wishlistSlice'

export default function WishlistGrid() {
  const dispatch = useDispatch()
  const items = useSelector((s) => s.wishlist.items)

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center">
          <Heart size={28} className="text-muted" />
        </div>
        <h1 className="font-display font-bold text-xl text-app">Your wishlist is empty</h1>
        <p className="text-sm text-muted max-w-sm">
          Tap the heart icon on any product to save it here for later.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-glow-sm transition-colors"
        >
          <ShoppingBag size={16} className="mr-2" /> Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-app mb-8">My Wishlist</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map((item) => (
          <div
            key={item.productId}
            className="group relative flex flex-col rounded-2xl bg-app border border-app overflow-hidden hover:shadow-card dark:hover:shadow-card-dark transition-all duration-300"
          >
            <button
              onClick={() => {
                dispatch(removeFromWishlist(item.productId))
                toast.success('Removed from wishlist')
              }}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-app/80 backdrop-blur-sm hover:bg-app text-app shadow-sm"
              aria-label="Remove from wishlist"
            >
              <X size={14} />
            </button>

            <Link to={item.slug ? `/products/${item.slug}` : `/custom/${item.productId}`} className="aspect-[4/5] bg-surface overflow-hidden">
              {item.thumbnail ? (
                <img
                  src={getImageUrl(item.thumbnail)}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                  No Image
                </div>
              )}
            </Link>

            <div className="flex flex-col gap-1 p-3.5">
              <Link to={item.slug ? `/products/${item.slug}` : `/custom/${item.productId}`} className="text-sm font-semibold text-app line-clamp-2 hover:text-brand-500">
                {item.title}
              </Link>
              {item.minPrice != null && (
                <span className="text-sm font-bold text-app">{formatPrice(item.minPrice)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
