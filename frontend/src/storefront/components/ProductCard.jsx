import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import clsx from 'clsx'
import { getImageUrl, formatPrice } from '@/shared/utils/productUtils'
import { toggleWishlist, selectIsWishlisted } from '@/storefront/store/wishlistSlice'
import { addToCart } from '@/storefront/store/cartSlice'
import toast from 'react-hot-toast'

function ProductCard({ product }) {
  const dispatch = useDispatch()
  const isWishlisted = useSelector(selectIsWishlisted(product.id))

  const variants = product.variants || []
  const inStock = (product.total_stock ?? 0) > 0
  const minPrice = product.min_price
  const firstVariant = variants[0]
  const hasDiscount =
    firstVariant &&
    Number(firstVariant.original_price) > Number(firstVariant.selling_price)
  const discountPct = hasDiscount
    ? Math.round(
        ((Number(firstVariant.original_price) - Number(firstVariant.selling_price)) /
          Number(firstVariant.original_price)) *
          100
      )
    : 0

  const handleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(
      toggleWishlist({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        thumbnail: product.thumbnail,
        minPrice: product.min_price,
      })
    )
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist')
  }

  const handleQuickAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!inStock || !firstVariant) {
      toast.error('Out of stock')
      return
    }
    dispatch(
      addToCart({
        productId: product.id,
        slug: product.slug,
        title: product.title,
        thumbnail: product.thumbnail,
        size: firstVariant.size,
        color: firstVariant.color || null,
        colorHex: firstVariant.color_hex || null,
        sellingPrice: Number(firstVariant.selling_price),
        originalPrice: Number(firstVariant.original_price),
        stockQuantity: firstVariant.stock_quantity,
        quantity: 1,
      })
    )
    toast.success('Added to cart')
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col rounded-2xl bg-app border border-app overflow-hidden hover:shadow-card dark:hover:shadow-card-dark transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] bg-surface overflow-hidden">
        {product.thumbnail ? (
          <img
            src={getImageUrl(product.thumbnail)}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            No Image
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_featured && (
            <span className="bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
              Featured
            </span>
          )}
          {hasDiscount && (
            <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
              {discountPct}% OFF
            </span>
          )}
          {!inStock && (
            <span className="bg-gray-700 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          aria-label="Toggle wishlist"
          className="absolute top-3 right-3 p-2 rounded-full bg-app/80 backdrop-blur-sm hover:bg-app text-app transition-colors duration-200 shadow-sm"
        >
          <Heart
            size={16}
            className={clsx(isWishlisted ? 'fill-red-500 text-red-500' : 'text-app')}
          />
        </button>

        {/* Quick add */}
        <button
          onClick={handleQuickAdd}
          disabled={!inStock}
          className={clsx(
            'absolute bottom-3 right-3 p-2.5 rounded-full shadow-glow-sm transition-all duration-300',
            'translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
            inStock
              ? 'bg-brand-500 hover:bg-brand-600 text-white'
              : 'bg-gray-400 text-white cursor-not-allowed'
          )}
          aria-label="Quick add to cart"
        >
          <ShoppingBag size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3.5">
        {(product.collection_name || product.collection) && (
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            {product.collection_name || product.collection}
          </span>
        )}
        <h3 className="text-sm font-semibold text-app line-clamp-2 leading-snug">
          {product.title}
        </h3>

        <div className="flex items-center gap-1.5 mt-1">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          <span className="text-[11px] text-muted">4.5</span>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          {minPrice != null ? (
            <>
              <span className="text-sm font-bold text-app">{formatPrice(minPrice)}</span>
              {hasDiscount && (
                <span className="text-xs text-muted line-through">
                  {formatPrice(firstVariant.original_price)}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted">Price unavailable</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default memo(ProductCard)
