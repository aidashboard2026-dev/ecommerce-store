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
 * Backend cart format:
 *
 * product_id
 * variant_id
 * selling_price
 *
 * Redux cart format:
 *
 * productId
 * variantId
 * sellingPrice
 */

export function mapDatabaseCartItem(
  item,
) {
  return {
    cartItemId:
      item.id,

    productId:
      item.product_id,

    variantId:
      item.variant_id,

    title:
      item.title,

    slug:
      item.slug,

    thumbnail:
      item.thumbnail,

    size:
      item.size,

    color:
      item.color,

    originalPrice:
      Number(
        item.original_price ?? 0,
      ),

    sellingPrice:
      Number(
        item.selling_price ?? 0,
      ),

    stockQuantity:
      Number(
        item.stock_quantity ?? 0,
      ),

    quantity:
      Number(
        item.quantity ?? 1,
      ),

    source:
      "database",
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
    mapDatabaseCartItem,
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