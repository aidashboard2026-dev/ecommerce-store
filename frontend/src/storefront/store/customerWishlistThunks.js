import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import {
  replaceWishlistItems,
} from "@/storefront/store/wishlistSlice";

const WISHLIST_API =
  "/api/v1/customer/wishlist";

// Backend response → Redux product format
function normalizeWishlistItem(item) {
  const product = item.product || {};

  return {
    wishlistItemId: item.id,

    productId:
      item.product_id ??
      product.id,

    title:
      product.title ??
      item.title ??
      "",

    slug:
      product.slug ??
      item.slug ??
      "",

    thumbnail:
      product.thumbnail ??
      item.thumbnail ??
      null,

    minPrice:
      product.min_price ??
      item.min_price ??
      null,
  };
}

// --------------------------------------------------
// Load logged-in customer's wishlist
// --------------------------------------------------

export const fetchCustomerWishlistThunk =
  createAsyncThunk(
    "customerWishlist/fetch",
    async (_, { dispatch, rejectWithValue }) => {
      try {
        const response = await axios.get(
          WISHLIST_API,
        );

        const rawItems = Array.isArray(
          response.data,
        )
          ? response.data
          : response.data?.items || [];

        const items = rawItems.map(
          normalizeWishlistItem,
        );

        dispatch(
          replaceWishlistItems(items),
        );

        return items;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.detail ||
            "Unable to load wishlist",
        );
      }
    },
  );

// --------------------------------------------------
// Add product to customer wishlist DB
// --------------------------------------------------

export const addCustomerWishlistItemThunk =
  createAsyncThunk(
    "customerWishlist/add",
    async (
      { productId },
      { rejectWithValue },
    ) => {
      try {
        const response = await axios.post(
          WISHLIST_API,
          {
            product_id: Number(
              productId,
            ),
          },
        );

        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.detail ||
            "Unable to add wishlist item",
        );
      }
    },
  );

// --------------------------------------------------
// Remove product from customer wishlist DB
// --------------------------------------------------

export const removeCustomerWishlistItemThunk =
  createAsyncThunk(
    "customerWishlist/remove",
    async (
      { productId },
      { rejectWithValue },
    ) => {
      try {
        await axios.delete(
          `${WISHLIST_API}/${productId}`,
        );

        return Number(productId);
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.detail ||
            "Unable to remove wishlist item",
        );
      }
    },
  );