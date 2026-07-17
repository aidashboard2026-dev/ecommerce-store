import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import clsx from 'clsx'
import { closeCartDrawer, selectCartCount } from '@/storefront/store/cartSlice'
import CartEmpty from '../shoppingcart/CartEmpty'
import CartFooter from '../shoppingcart/CartFooter'
import CartHeader from '../shoppingcart/CartHeader'
import CartItem from '../shoppingcart/CartItem'

export default function CartDrawer() {
  const dispatch = useDispatch()
  const items = useSelector((state) => state.cart.items)
  const isDrawerOpen = useSelector((state) => state.cart.isDrawerOpen)
  const count = useSelector(selectCartCount)

  const handleClose = () => {
    dispatch(closeCartDrawer())
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 transition pointer-events-none',
        isDrawerOpen && 'pointer-events-auto',
      )}
      aria-hidden={!isDrawerOpen}
    >
      <button
        type="button"
        className={clsx(
          'absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300',
          isDrawerOpen ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleClose}
        aria-label="Close cart"
        tabIndex={isDrawerOpen ? 0 : -1}
      />

      <aside
        className={clsx(
          'absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-app text-app shadow-2xl transition-transform duration-300 ease-out sm:border-l sm:border-app',
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <CartHeader count={count} onClose={handleClose} />

        {items.length === 0 ? (
          <CartEmpty onStartShopping={handleClose} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6">
              {items.map((item) => (
                <CartItem
                  key={`cart-${
                    item.cartItemId ??
                    item.cart_item_id ??
                    item.id ??
                    item.variantId ??
                    item.variant_id ??
                    `${item.productId}-${item.size}-${item.color}`
                  }`}
                  item={item}
                />
              ))}
            </div>
            <CartFooter />
          </>
        )}
      </aside>
    </div>
  )
}
