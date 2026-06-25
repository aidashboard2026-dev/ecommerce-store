// Custom-order product type catalogue. Drives both the type-selection grid
// on the CustomPage index and the dynamic form fields rendered for each
// type. No backend model exists for these yet (per the brief, no new APIs
// are wired here) — this is purely a lead-capture / quote-request UI.
export const PRODUCT_TYPES = [
  {
    key: 'tshirt',
    label: 'Custom T-Shirts',
    emoji: '👕',
    description: 'Bulk or single custom-printed tees in your own design.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Black', 'Navy', 'Red', 'Grey'],
  },
  {
    key: 'trackpant',
    label: 'Custom Track Pants',
    emoji: '🩳',
    description: 'Custom-fit track pants for teams, gyms, or events.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'Navy', 'Grey'],
  },
  {
    key: 'jersey',
    label: 'Custom Jerseys',
    emoji: '🎽',
    description: 'Team jerseys with custom names, numbers, and club colors.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White'],
  },
  {
    key: 'cup',
    label: 'Cup Printing',
    emoji: '☕',
    description: 'Magic (colour-changing) or classic white cup printing.',
    styles: ['Magic Cup', 'White Cup'],
  },
  {
    key: 'embroidery',
    label: 'Embroidery Design',
    emoji: '🧵',
    description: 'Custom embroidered logos and designs on apparel.',
    placements: ['Chest', 'Sleeve', 'Cap', 'Back'],
  },
  {
    key: 'keychain',
    label: 'Keychain Printing',
    emoji: '🔑',
    description: 'Personalised acrylic, wood, or metal keychains.',
    colors: ['Acrylic Clear', 'Wood', 'Metal'],
  },
  {
    key: 'corporate',
    label: 'Corporate Merchandise',
    emoji: '🏢',
    description: 'Branded merchandise for offices, events, and giveaways.',
  },
  {
    key: 'bulk',
    label: 'Bulk Orders',
    emoji: '📦',
    description: 'Large-quantity orders across any product type, with bulk pricing.',
  },
]
