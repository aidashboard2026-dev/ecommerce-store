import React from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Trash2, Minus, Plus } from 'lucide-react'
import { getImageUrl, formatPrice } from '../../../../utils/productUtils'
import { updateQuantity, removeFromCart } from '../../../../store/cartSlice'
import toast from 'react-hot-toast'

export default function CartItem({ item }) {
  const dispatch = useDispatch()

  const lineKey = { productId: item.productId, size: item.size, color: item.color }

  const handleQty = (delta) => {
    const next = item.quantity + delta
    if (next < 1) return
    if (item.stockQuantity != null && next > item.stockQuantity) {
      toast.error(`Only ${item.stockQuantity} in stock`)
      return
    }
    dispatch(updateQuantity({ ...lineKey, quantity: next }))
  }

  const handleRemove = () => {
    dispatch(removeFromCart(lineKey))
    toast.success('Removed from cart')
  }

  return (
    <div className="flex gap-4 py-4 border-b border-app last:border-b-0">
      <Link to={`/products/${item.slug}`} className="shrink-0">
        <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-surface overflow-hidden border border-app">
          {item.thumbnail ? (
            <img
              src={getImageUrl(item.thumbnail)}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-[10px]">
              No Image
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <Link to={`/products/${item.slug}`} className="text-sm font-semibold text-app line-clamp-2 hover:text-brand-500">
          {item.title}
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted">
          {item.size && <span>Size: {item.size}</span>}
          {item.color && (
            <span className="flex items-center gap-1">
              Color:
              <span
                className="inline-block h-3 w-3 rounded-full border border-app"
                style={{ backgroundColor: item.colorHex || '#ccc' }}
              />
              {item.color}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm font-bold text-app">{formatPrice(item.sellingPrice)}</span>
          {item.originalPrice > item.sellingPrice && (
            <span className="text-xs text-muted line-through">{formatPrice(item.originalPrice)}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-app rounded-lg overflow-hidden">
            <button onClick={() => handleQty(-1)} className="p-1.5 text-app hover:bg-surface" aria-label="Decrease quantity">
              <Minus size={12} />
            </button>
            <span className="px-3 text-xs font-semibold text-app">{item.quantity}</span>
            <button onClick={() => handleQty(1)} className="p-1.5 text-app hover:bg-surface" aria-label="Increase quantity">
              <Plus size={12} />
            </button>
          </div>

          <button onClick={handleRemove} className="p-1.5 text-muted hover:text-red-500" aria-label="Remove item">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end justify-center shrink-0">
        <span className="text-sm font-bold text-app">
          {formatPrice(item.sellingPrice * item.quantity)}
        </span>
      </div>
    </div>
  )
}
