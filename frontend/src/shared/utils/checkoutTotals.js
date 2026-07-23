const toNumber = (value) => Number(value || 0)

export const calculateLineTotal = (price, quantity) =>
  toNumber(price) * toNumber(quantity || 1)

export const calculateCartSubtotal = (items = []) =>
  items.reduce(
    (sum, item) => sum + calculateLineTotal(item.sellingPrice, item.quantity),
    0,
  )

export const calculateDiscountAmount = (subtotal, couponDiscount = 0) =>
  (toNumber(subtotal) * toNumber(couponDiscount)) / 100

export const calculateShippingAmount = (subtotal, shippingFee = 0) =>
  toNumber(subtotal) > 0 ? toNumber(shippingFee) : 0

export const calculateCheckoutTotals = ({
  items = [],
  couponDiscount = 0,
  shippingFee = 0,
}) => {
  const subtotal = calculateCartSubtotal(items)
  const discountAmount = calculateDiscountAmount(subtotal, couponDiscount)
  const discountedSubtotal = subtotal - discountAmount
  const shipping = calculateShippingAmount(subtotal, shippingFee)
  const total = discountedSubtotal + shipping

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    shipping,
    total,
  }
}

export const resolveShippingFeeFromPayments = (
  paymentMethods = [],
  paymentMethod = 'ONLINE',
) => {
  if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
    return 0
  }

  const desiredName =
    paymentMethod === 'COD' ? 'Cash On Delivery' : 'Online Payment'

  const preferred = paymentMethods.find(
    (method) =>
      method?.name?.toLowerCase() === desiredName.toLowerCase() &&
      method?.is_active !== false,
  )

  const fallback =
    paymentMethods.find((method) => method?.is_active !== false) ||
    paymentMethods[0]

  return toNumber((preferred || fallback)?.fee)
}

export const formatQuantitySubtotal = (price, quantity, formatPrice) =>
  `${formatPrice(toNumber(price))} × ${toNumber(quantity || 1)} = ${formatPrice(
    calculateLineTotal(price, quantity),
  )}`
