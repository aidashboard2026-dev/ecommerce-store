import {
  customerCartAPI,
  customerWishlistAPI,
} from "./customerCollectionService";


const GUEST_CART_KEY =
  "aurastore_guest_cart";

const GUEST_WISHLIST_KEY =
  "aurastore_guest_wishlist";


function readArray(storageKey) {
  try {
    const raw =
      localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}


function getProductId(item) {
  return Number(
    item.productId ??
      item.product_id ??
      item.id,
  );
}


function getVariantId(item) {
  const value =
    item.variantId ??
    item.variant_id ??
    null;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const variantId =
    Number(value);

  return Number.isInteger(variantId)
    && variantId > 0
    ? variantId
    : null;
}


function getQuantity(item) {
  const quantity =
    Number(item.quantity ?? 1);

  if (
    !Number.isFinite(quantity)
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(
      Math.trunc(quantity),
      100,
    ),
  );
}


/*
 * Central normalization layer.
 *
 * Accepts a raw cart item from ANY source
 * (backend API snake_case OR frontend guest camelCase)
 * and returns ONE consistent shape used by every component.
 */

export function normalizeCartItem(raw) {
  const cartItemId = raw.cartItemId ?? raw.cart_item_id ?? raw.id ?? null;
  const productId = raw.productId ?? raw.product_id ?? null;
  const variantId = raw.variantId ?? raw.variant_id ?? null;

  const title = raw.title ?? "";
  const slug = raw.slug ?? "";
  const thumbnail = raw.thumbnail ?? null;
  const size = raw.size ?? null;
  const color = raw.color ?? null;
  const colorHex = raw.colorHex ?? raw.color_hex ?? null;

  let rawSelling = raw.sellingPrice ?? raw.selling_price;
  let sellingPrice = rawSelling != null ? Number(rawSelling) : 0;
  if (!Number.isFinite(sellingPrice)) sellingPrice = 0;

  let rawOriginal = raw.originalPrice ?? raw.original_price;
  let originalPrice = rawOriginal != null ? Number(rawOriginal) : 0;
  if (!Number.isFinite(originalPrice)) originalPrice = 0;

  let rawStock = raw.stockQuantity ?? raw.stock_quantity;
  let stockQuantity = rawStock != null ? Number(rawStock) : 0;
  if (!Number.isFinite(stockQuantity)) stockQuantity = 0;

  const quantity = Math.max(1, Number(raw.quantity ?? 1) || 1);

  const source = raw.source ?? (cartItemId ? "database" : "guest");

  return {
    cartItemId,
    productId,
    variantId,
    title,
    slug,
    thumbnail,
    size,
    color,
    colorHex,
    sellingPrice,
    originalPrice,
    stockQuantity,
    quantity,
    source,
  };
}


export function mapDatabaseWishlistItem(
  item,
) {
  return {
    wishlistItemId:
      item.id,

    productId:
      item.product_id,

    title:
      item.title,

    slug:
      item.slug,

    thumbnail:
      item.thumbnail,

    minPrice:
      Number(
        item.min_price ?? 0,
      ),

    source:
      "database",
  };
}


/*
 * Load current customer's DB cart.
 */

export async function loadCustomerCart() {
  const response =
    await customerCartAPI
      .getItems();

  const items =
    response.data?.items ?? [];

  return items.map(
    normalizeCartItem,
  );
}


/*
 * Load current customer's DB wishlist.
 */

export async function loadCustomerWishlist() {
  const response =
    await customerWishlistAPI
      .getItems();

  const items =
    response.data?.items ?? [];

  return items.map(
    mapDatabaseWishlistItem,
  );
}


/*
 * Guest cart/wishlist → DB.
 */

export async function syncGuestCollections() {
  const guestCart =
    readArray(
      GUEST_CART_KEY,
    );

  const guestWishlist =
    readArray(
      GUEST_WISHLIST_KEY,
    );


  // Guest cart → Customer DB

  for (
    const item
    of guestCart
  ) {
    const productId =
      getProductId(item);

    if (
      !Number.isInteger(
        productId,
      )
      || productId <= 0
    ) {
      console.warn(
        "Invalid guest cart item skipped:",
        item,
      );

      continue;
    }

    await customerCartAPI
      .addItem({
        product_id:
          productId,

        variant_id:
          getVariantId(item),

        quantity:
          getQuantity(item),
      });
  }


  // Guest wishlist → Customer DB

  for (
    const item
    of guestWishlist
  ) {
    const productId =
      getProductId(item);

    if (
      !Number.isInteger(
        productId,
      )
      || productId <= 0
    ) {
      console.warn(
        "Invalid guest wishlist item skipped:",
        item,
      );

      continue;
    }

    await customerWishlistAPI
      .addItem(
        productId,
      );
  }


  /*
   * Remove guest storage only when
   * all valid API requests succeed.
   */

  localStorage.removeItem(
    GUEST_CART_KEY,
  );

  localStorage.removeItem(
    GUEST_WISHLIST_KEY,
  );
}


/*
 * Sync guest data and return
 * current customer's complete DB data.
 */

export async function syncAndLoadCustomerCollections() {
  await syncGuestCollections();

  const [
    cartItems,
    wishlistItems,
  ] = await Promise.all([
    loadCustomerCart(),
    loadCustomerWishlist(),
  ]);

  return {
    cartItems,
    wishlistItems,
  };
}