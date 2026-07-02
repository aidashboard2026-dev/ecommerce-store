import { describe, it, expect, beforeEach } from 'vitest';
import cartReducer, {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  selectCartTotals,
  selectCartCount,
  selectCartSubtotal
} from '@/storefront/store/cartSlice';

describe('cartSlice reducers and selectors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const getInitialState = () => ({
    items: [],
    couponCode: null,
    couponDiscount: 0,
    couponError: null,
    isDrawerOpen: false,
  });

  it('should handle addToCart for new item', () => {
    const state = getInitialState();
    const item = {
      productId: 1,
      size: 'M',
      color: 'Black',
      sellingPrice: 100,
      originalPrice: 120,
      stockQuantity: 10,
    };
    
    const nextState = cartReducer(state, addToCart(item));
    expect(nextState.items).toHaveLength(1);
    expect(nextState.items[0].productId).toBe(1);
    expect(nextState.items[0].quantity).toBe(1);
  });

  it('should handle addToCart incrementing quantity for existing item', () => {
    const state = {
      ...getInitialState(),
      items: [
        { productId: 1, size: 'M', color: 'Black', sellingPrice: 100, quantity: 2, stockQuantity: 5 }
      ]
    };
    
    const item = { productId: 1, size: 'M', color: 'Black', sellingPrice: 100 };
    const nextState = cartReducer(state, addToCart(item));
    expect(nextState.items[0].quantity).toBe(3);
  });

  it('should handle updateQuantity within limits', () => {
    const state = {
      ...getInitialState(),
      items: [
        { productId: 1, size: 'M', color: 'Black', sellingPrice: 100, quantity: 2, stockQuantity: 5 }
      ]
    };

    const nextState = cartReducer(state, updateQuantity({ productId: 1, size: 'M', color: 'Black', quantity: 4 }));
    expect(nextState.items[0].quantity).toBe(4);

    // Try setting past stockQuantity
    const nextStateOver = cartReducer(state, updateQuantity({ productId: 1, size: 'M', color: 'Black', quantity: 10 }));
    expect(nextStateOver.items[0].quantity).toBe(5);
  });

  it('should handle removeFromCart', () => {
    const state = {
      ...getInitialState(),
      items: [
        { productId: 1, size: 'M', color: 'Black', sellingPrice: 100, quantity: 2 }
      ]
    };

    const nextState = cartReducer(state, removeFromCart({ productId: 1, size: 'M', color: 'Black' }));
    expect(nextState.items).toHaveLength(0);
  });

  it('should compute selectors and totals correctly', () => {
    const rootState = {
      cart: {
        ...getInitialState(),
        items: [
          { productId: 1, size: 'M', color: 'Black', sellingPrice: 200, originalPrice: 250, quantity: 2 },
          { productId: 2, size: 'L', color: 'Blue', sellingPrice: 100, originalPrice: 100, quantity: 1 }
        ],
        couponDiscount: 10, // 10% discount
      }
    };

    // Subtotal: 200 * 2 + 100 * 1 = 500
    // Discount: 10% of 500 = 50
    // Discounted Subtotal: 450
    // Shipping: Under 999 threshold -> 79
    // Tax: 5% of 450 = 22.50
    // Total: 450 + 79 + 22.50 = 551.50

    expect(selectCartCount(rootState)).toBe(3);
    
    const totals = selectCartTotals(rootState);
    expect(totals.subtotal).toBe(500);
    expect(totals.discountAmount).toBe(50);
    expect(totals.discountedSubtotal).toBe(450);
    expect(totals.shipping).toBe(79);
    expect(totals.tax).toBe(22.5);
    expect(totals.total).toBe(551.5);
  });
});
