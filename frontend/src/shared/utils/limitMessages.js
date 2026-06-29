/**
 * limitMessages.js
 *
 * Centralised business limit message factory.
 *
 * TWO categories of limits have different UX meanings:
 *
 * STRUCTURAL LIMITS (catalog/configuration items):
 *   Categories, Collections, Sub-Collections, Custom Categories
 *   → "Store configuration is at maximum. Contact administrator."
 *   → These reflect business growth — admin must increase the limit.
 *
 * OPERATIONAL LIMITS (content/inventory items):
 *   Banners, Offers, Product Images, Variants
 *   → "Delete an existing item before adding another."
 *   → These are everyday operations — no admin intervention needed.
 */

// ─── Structural limit messages ─────────────────────────────────────────────────

export function getStructuralLimitMessage(type, max) {
  return "Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
}

// ─── Operational limit messages ────────────────────────────────────────────────

export function getOperationalLimitMessage(type, max) {
  const labels = {
    banner:  { singular: 'banner',  article: 'a' },
    offer:   { singular: 'offer',   article: 'an' },
    image:   { singular: 'image',   article: 'an' },
    variant: { singular: 'variant', article: 'a' },
  }

  const label = labels[type]
  if (!label) return 'Maximum limit reached. Delete an existing item before adding another.'

  const suffix = max != null ? ` (maximum: ${max})` : ''
  return `You have reached the maximum allowed limit${suffix}. Delete an existing ${label.singular} before adding another.`
}

// ─── Convenience: check and return the right message by domain ─────────────────

const STRUCTURAL_TYPES = new Set(['category', 'collection', 'sub_collection', 'custom_category'])
const OPERATIONAL_TYPES = new Set(['banner', 'offer', 'image', 'variant'])

export function getLimitMessage(type, max) {
  if (STRUCTURAL_TYPES.has(type)) return getStructuralLimitMessage(type, max)
  if (OPERATIONAL_TYPES.has(type)) return getOperationalLimitMessage(type, max)
  return 'Maximum limit reached.'
}
