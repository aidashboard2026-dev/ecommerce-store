
export const CART_DRAWER_MAX_WIDTH_PX = 420;

/**
 * z-index tiers, mirrored from tailwind.config.js `theme.extend.zIndex`.
 * Exported here for any JS context that needs the numeric value directly
 * (e.g. a portal's inline style, or a third-party library's `style` prop
 * that can't take a Tailwind class). Keep in sync with tailwind.config.js.
 *
 * KNOWN CONFLICT (documented, not resolved in Phase A): `top` (50) is shared
 * by the navbar, modals, drawers, and dropdowns. See tailwind.config.js for
 * the full note. Do not use this to "fix" the collision silently — that is
 * a Phase B product decision.
 */
export const Z_INDEX = {
  raised: 10,
  elevated: 20,
  header: 30,
  drawer: 40,
  top: 50,
};