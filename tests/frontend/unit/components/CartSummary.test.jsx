import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CartSummary from '@/storefront/components/cart/CartSummary';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Setup default mock values
let mockTotals = {
  subtotal: 500,
  discountAmount: 50,
  discountedSubtotal: 450,
  shipping: 79,
  tax: 22.5,
  total: 551.5,
};
let mockCount = 3;
let mockCouponCode = 'SAVE10';
let mockCouponDiscount = 10;

// Mock react-redux
vi.mock('react-redux', () => ({
  useSelector: (selectorFn) => {
    // We can evaluate based on what fields the component is accessing
    // Or check if the function is one of the selectors
    const selectorStr = selectorFn.toString();
    if (selectorStr.includes('selectCartTotals')) {
      return mockTotals;
    }
    if (selectorStr.includes('selectCartCount')) {
      return mockCount;
    }
    // Otherwise it is the state selector for cart coupon fields: useSelector((s) => s.cart)
    return { couponCode: mockCouponCode, couponDiscount: mockCouponDiscount };
  },
}));

// Mock CartCoupon to prevent extra sub-component rendering dependencies
vi.mock('./CartCoupon', () => ({
  default: () => <div data-testid="mock-coupon">Coupon Panel</div>,
}));

// Mock price formatting
vi.mock('@/shared/utils/productUtils', () => ({
  formatPrice: (val) => `₹${val.toFixed(2)}`,
}));

describe('CartSummary Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Reset defaults
    mockTotals = {
      subtotal: 500,
      discountAmount: 50,
      discountedSubtotal: 450,
      shipping: 79,
      tax: 22.5,
      total: 551.5,
    };
    mockCount = 3;
    mockCouponCode = 'SAVE10';
    mockCouponDiscount = 10;
  });

  it('renders all totals, coupon details, tax and shipping correctly', () => {
    render(<CartSummary showCheckoutButton={true} />);

    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('Subtotal (3 items)')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    expect(screen.getByText('Discount (10%)')).toBeInTheDocument();
    expect(screen.getByText('-₹50.00')).toBeInTheDocument();
    expect(screen.getByText('₹79.00')).toBeInTheDocument();
    expect(screen.getByText('₹22.50')).toBeInTheDocument();
    expect(screen.getByText('₹551.50')).toBeInTheDocument();
    expect(screen.getByTestId('mock-coupon')).toBeInTheDocument();
  });

  it('displays free shipping when shipping cost is 0', () => {
    mockTotals.shipping = 0;
    render(<CartSummary showCheckoutButton={true} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('navigates to /checkout when Proceed button is clicked', () => {
    render(<CartSummary showCheckoutButton={true} />);
    const button = screen.getByRole('button', { name: /Proceed to Checkout/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/checkout');
  });

  it('disables checkout button when cart is empty', () => {
    mockCount = 0;
    render(<CartSummary showCheckoutButton={true} />);
    const button = screen.getByRole('button', { name: /Proceed to Checkout/i });
    expect(button).toBeDisabled();
  });
});
