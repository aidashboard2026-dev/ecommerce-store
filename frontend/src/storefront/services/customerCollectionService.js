import { storefrontClient } from "../../shared/services/api";


const CUSTOMER_CART_URL =
  "/customer/cart";

const CUSTOMER_WISHLIST_URL =
  "/customer/wishlist";


export const customerCartAPI = {
  getItems() {
    return storefrontClient.get(
      CUSTOMER_CART_URL,
    );
  },

  addItem(data) {
    return storefrontClient.post(
      CUSTOMER_CART_URL,
      data,
    );
  },

  updateQuantity(
    cartItemId,
    quantity,
  ) {
    return storefrontClient.patch(
      `${CUSTOMER_CART_URL}/${cartItemId}`,
      {
        quantity,
      },
    );
  },

  removeItem(
    cartItemId,
  ) {
    return storefrontClient.delete(
      `${CUSTOMER_CART_URL}/${cartItemId}`,
    );
  },

  clearItems() {
    return storefrontClient.delete(
      CUSTOMER_CART_URL,
    );
  },
};


export const customerWishlistAPI = {
  getItems() {
    return storefrontClient.get(
      CUSTOMER_WISHLIST_URL,
    );
  },

  addItem(
    productId,
  ) {
    return storefrontClient.post(
      CUSTOMER_WISHLIST_URL,
      {
        product_id:
          productId,
      },
    );
  },

  removeItem(
    productId,
  ) {
    return storefrontClient.delete(
      `${CUSTOMER_WISHLIST_URL}/product/${productId}`,
    );
  },

  clearItems() {
    return storefrontClient.delete(
      CUSTOMER_WISHLIST_URL,
    );
  },
};