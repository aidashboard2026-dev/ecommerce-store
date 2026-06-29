import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Heart, ShoppingBag, Zap, ChevronLeft, ChevronRight, Star, Truck, ShieldCheck, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { useProductBySlug, useProductsInfinite } from '@/storefront/hooks/product/useProducts'
import { getImageUrl, formatPrice } from '@/shared/utils/productUtils'
import { addToCart, openCartDrawer } from '@/storefront/store/cartSlice'
import { toggleWishlist, selectIsWishlisted } from '@/storefront/store/wishlistSlice'
import ProductGrid from '@/storefront/components/product/components/ProductGrid'

export default function ProductDetailsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { data: product, isLoading, isError } = useProductBySlug(slug)
  const isWishlisted = useSelector(selectIsWishlisted(product?.id))

  const [activeImage, setActiveImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [zoomed, setZoomed] = useState(false)

  // Reset selections when product changes
  useEffect(() => {
    if (product?.variants?.length) {
      setSelectedSize(product.variants[0].size)
      setSelectedColor(product.variants[0].color || null)
      setQuantity(1)
      setActiveImage(0)
    }
  }, [product?.id])

  const variants = product?.variants || []

  const sizes = useMemo(() => {
    const set = new Set()
    variants.forEach((v) => set.add(v.size))
    return Array.from(set)
  }, [variants])

  const colorsForSize = useMemo(() => {
    const map = new Map()
    variants
      .filter((v) => v.size === selectedSize)
      .forEach((v) => {
        if (v.color) map.set(v.color, v.color_hex)
      })
    return Array.from(map.entries())
  }, [variants, selectedSize])

  const activeVariant = useMemo(() => {
    return (
      variants.find(
        (v) => v.size === selectedSize && (colorsForSize.length === 0 || v.color === selectedColor)
      ) || variants.find((v) => v.size === selectedSize)
    )
  }, [variants, selectedSize, selectedColor, colorsForSize])

  // Related products from the same collection
  const { data: relatedData } = useProductsInfinite({
    collection: product?.collection || undefined,
    per_page: 8,
  })
  const relatedProducts = useMemo(() => {
    const items = relatedData?.pages?.[0]?.items || []
    return items.filter((p) => p.id !== product?.id).slice(0, 4)
  }, [relatedData, product?.id])

  // Image gallery — currently single thumbnail; treat as a 1-image gallery,
  // with graceful fallback if `images` array is populated in future.
  const images = useMemo(() => {
    if (product?.images?.length) return product.images
    if (product?.thumbnail) return [product.thumbnail]
    return []
  }, [product])

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-square bg-surface rounded-2xl" />
          <div className="flex flex-col gap-8">
            <div className="h-4 w-1/3 bg-surface rounded" />
            <div className="h-8 w-2/3 bg-surface rounded" />
            <div className="h-6 w-1/4 bg-surface rounded" />
            <div className="h-24 w-full bg-surface rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-app font-semibold mb-4">Product not found.</p>
        <Link to="/products" className="text-brand-500 font-semibold text-sm">
          Back to shop
        </Link>
      </div>
    )
  }

  const inStock = (activeVariant?.stock_quantity ?? 0) > 0
  const hasDiscount =
    activeVariant && Number(activeVariant.original_price) > Number(activeVariant.selling_price)
  const discountPct = hasDiscount
    ? Math.round(
        ((Number(activeVariant.original_price) - Number(activeVariant.selling_price)) /
          Number(activeVariant.original_price)) *
          100
      )
    : 0

  const buildCartItem = () => ({
    productId: product.id,
    slug: product.slug,
    title: product.title,
    thumbnail: product.thumbnail,
    size: activeVariant.size,
    color: activeVariant.color || null,
    colorHex: activeVariant.color_hex || null,
    sellingPrice: Number(activeVariant.selling_price),
    originalPrice: Number(activeVariant.original_price),
    stockQuantity: activeVariant.stock_quantity,
    quantity,
  })

  const handleAddToCart = () => {
    if (!activeVariant) return
    if (!inStock) {
      toast.error('This variant is out of stock')
      return
    }
    dispatch(addToCart(buildCartItem()))
    dispatch(openCartDrawer())
    toast.success('Added to cart')
  }

  const handleBuyNow = () => {
    if (!activeVariant) return
    if (!inStock) {
      toast.error('This variant is out of stock')
      return
    }
    dispatch(addToCart(buildCartItem()))
    navigate('/checkout')
  }

  const handleWishlist = () => {
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

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="text-xs text-muted mb-6">
        <Link to="/" className="hover:text-app">Home</Link> /{' '}
        <Link to="/products" className="hover:text-app">Shop</Link> /{' '}
        <span className="text-app">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div className="flex flex-col gap-3">
          <div
            className={clsx(
              'relative aspect-square bg-surface rounded-2xl overflow-hidden border border-app cursor-zoom-in',
            )}
            onClick={() => setZoomed((z) => !z)}
          >
            {images.length > 0 ? (
              <img
                src={getImageUrl(images[activeImage])}
                alt={product.title}
                className={clsx(
                  'w-full h-full object-cover transition-transform duration-300',
                  zoomed ? 'scale-150' : 'scale-100'
                )}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                No Image Available
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImage((i) => (i - 1 + images.length) % images.length)
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-app/80 hover:bg-app shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImage((i) => (i + 1) % images.length)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-app/80 hover:bg-app shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={clsx(
                    'w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors',
                    activeImage === i ? 'border-brand-500' : 'border-app'
                  )}
                >
                  <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          {product.collection && (
            <span className="text-xs uppercase tracking-wider text-brand-500 font-semibold">
              {product.collection}
            </span>
          )}

          <h1 className="font-display font-bold text-2xl sm:text-3xl text-app">{product.title}</h1>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
            ))}
            <span className="text-xs text-muted ml-1">4.5 (128 reviews)</span>
          </div>

          {activeVariant && (
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-app">
                {formatPrice(activeVariant.selling_price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-muted line-through">
                    {formatPrice(activeVariant.original_price)}
                  </span>
                  <span className="text-sm font-bold text-red-500">{discountPct}% OFF</span>
                </>
              )}
            </div>
          )}

          {product.description && (
            <p className="text-sm text-muted leading-relaxed">{product.description}</p>
          )}

          {/* Size selection */}
          {sizes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-2">Size</h4>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size)
                      setSelectedColor(null)
                      setQuantity(1)
                    }}
                    className={clsx(
                      'min-w-[3rem] px-3 py-2 rounded-xl border text-sm font-semibold transition-colors',
                      selectedSize === size
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-app text-app hover:border-brand-500'
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selection */}
          {colorsForSize.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-2">Color</h4>
              <div className="flex flex-wrap gap-2">
                {colorsForSize.map(([color, hex]) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color)
                      setQuantity(1)
                    }}
                    title={color}
                    className={clsx(
                      'h-9 w-9 rounded-full border-2 transition-all',
                      selectedColor === color ? 'border-brand-500 scale-110' : 'border-app'
                    )}
                    style={{ backgroundColor: hex || '#ccc' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stock status */}
          <div>
            {activeVariant ? (
              inStock ? (
                <span className="text-xs font-semibold text-green-600">
                  In Stock ({activeVariant.stock_quantity} available)
                </span>
              ) : (
                <span className="text-xs font-semibold text-red-500">Out of Stock</span>
              )
            ) : (
              <span className="text-xs text-muted">Select options to check availability</span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app">Quantity</h4>
            <div className="flex items-center border border-app rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-app hover:bg-surface"
              >
                −
              </button>
              <span className="px-4 py-1.5 text-sm font-semibold text-app">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity((q) => Math.min(q + 1, activeVariant?.stock_quantity ?? 1))
                }
                className="px-3 py-1.5 text-app hover:bg-surface"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className={clsx(
                'flex-1 inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-semibold transition-colors',
                inStock
                  ? 'border border-brand-500 text-brand-500 hover:bg-brand-500/10'
                  : 'border border-app text-muted cursor-not-allowed'
              )}
            >
              <ShoppingBag size={16} /> Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!inStock}
              className={clsx(
                'flex-1 inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-semibold transition-colors',
                inStock
                  ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-glow-sm'
                  : 'bg-gray-400 text-white cursor-not-allowed'
              )}
            >
              <Zap size={16} /> Buy Now
            </button>
            <button
              onClick={handleWishlist}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-app py-3 px-5 text-sm font-semibold text-app hover:bg-surface transition-colors"
            >
              <Heart size={16} className={clsx(isWishlisted && 'fill-red-500 text-red-500')} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-app">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Truck size={18} className="text-brand-500" />
              <span className="text-[10px] text-muted">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <ShieldCheck size={18} className="text-brand-500" />
              <span className="text-[10px] text-muted">Secure Payment</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <RotateCcw size={18} className="text-brand-500" />
              <span className="text-[10px] text-muted">Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-app mb-6">
            You May Also Like
          </h2>
          <ProductGrid products={relatedProducts} loading={false} />
        </section>
      )}
    </div>
  )
}
