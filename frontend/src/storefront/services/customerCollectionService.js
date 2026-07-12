import axios from "axios";


const CUSTOMER_CART_URL =
  "/api/v1/customer/cart";

const CUSTOMER_WISHLIST_URL =
  "/api/v1/customer/wishlist";


export const customerCartAPI = {
  getItems() {
    return axios.get(
      CUSTOMER_CART_URL,
    );
  },

  addItem(data) {
    return axios.post(
      CUSTOMER_CART_URL,
      data,
    );
  },

  updateQuantity(
    cartItemId,
    quantity,
  ) {
    return axios.patch(
      `${CUSTOMER_CART_URL}/${cartItemId}`,
      {
        quantity,
      },
    );
  },

  removeItem(
    cartItemId,
  ) {
    return axios.delete(
      `${CUSTOMER_CART_URL}/${cartItemId}`,
    );
  },

  clearItems() {
    return axios.delete(
      CUSTOMER_CART_URL,
    );
  },
};


export const customerWishlistAPI = {
  getItems() {
    return axios.get(
      CUSTOMER_WISHLIST_URL,
    );
  },

  addItem(
    productId,
  ) {
    return axios.post(
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
    return axios.delete(
      `${CUSTOMER_WISHLIST_URL}/product/${productId}`,
    );
  },

  clearItems() {
    return axios.delete(
      CUSTOMER_WISHLIST_URL,
    );
  },
};