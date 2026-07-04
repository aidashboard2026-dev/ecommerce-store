import React from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Heart, X, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { getImageUrl, formatPrice } from '@/shared/utils/productUtils'
import { removeFromWishlist } from '@/storefront/store/wishlistSlice'
import { useProductBySlug } from '@/storefront/hooks/useProducts'

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
          <WishlistItemCard key={item.productId} item={item} dispatch={dispatch} />
        ))}
      </div>
    </div>
  )
}

// Wishlisted items only carry a snapshot (title/thumbnail/price) taken at the
// moment they were saved. Fetching live data here keeps price accurate if the
// product is edited later, and lets us flag products that were unpublished
// or deleted instead of linking to a dead page with no indication why.
function WishlistItemCard({ item, dispatch }) {
  const { data: liveProduct, isError } = useProductBySlug(item.slug)

  const unavailable = isError
  const title = liveProduct?.title ?? item.title
  const thumbnail = liveProduct?.thumbnail ?? item.thumbnail
  const minPrice = liveProduct?.min_price ?? item.minPrice

  return (
    <div
      className={clsx(
        'group relative flex flex-col rounded-2xl bg-app border border-app overflow-hidden transition-all duration-300',
        unavailable ? 'opacity-60' : 'hover:shadow-card dark:hover:shadow-card-dark'
      )}
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

      {unavailable ? (
        <div className="aspect-[4/5] bg-surface flex items-center justify-center text-muted text-xs text-center px-4">
          No longer available
        </div>
      ) : (
        <Link to={`/products/${item.slug}`} className="aspect-[4/5] bg-surface overflow-hidden">
          {thumbnail ? (
            <img
              src={getImageUrl(thumbnail)}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-xs">
              No Image
            </div>
          )}
        </Link>
      )}

      <div className="flex flex-col gap-1 p-3.5">
        {unavailable ? (
          <span className="text-sm font-semibold text-muted line-clamp-2">{title}</span>
        ) : (
          <Link to={`/products/${item.slug}`} className="text-sm font-semibold text-app line-clamp-2 hover:text-brand-500">
            {title}
          </Link>
        )}
        {!unavailable && minPrice != null && (
          <span className="text-sm font-bold text-app">{formatPrice(minPrice)}</span>
        )}
      </div>
    </div>
  )
}
