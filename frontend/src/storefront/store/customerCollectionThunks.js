import {
  createAsyncThunk,
} from "@reduxjs/toolkit";

import {
  replaceCartItems,
} from "./cartSlice";

import {
  replaceWishlistItems,
} from "./wishlistSlice";

import {
  loadCustomerCart,
  loadCustomerWishlist,
  syncAndLoadCustomerCollections,
} from "../services/customerCollectionSync";


export const syncCustomerCollectionsThunk =
  createAsyncThunk(
    "customerCollections/sync",

    async (
      _,
      {
        dispatch,
        rejectWithValue,
      },
    ) => {
      try {
        const {
          cartItems,
          wishlistItems,
        } =
          await syncAndLoadCustomerCollections();

        dispatch(
          replaceCartItems(
            cartItems,
          ),
        );

        dispatch(
          replaceWishlistItems(
            wishlistItems,
          ),
        );

        return {
          cartItems,
          wishlistItems,
        };
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.detail
            || error.message
            || (
              "Unable to sync cart "
              + "and wishlist."
            ),
        );
      }
    },
  );


export const loadCustomerCollectionsThunk =
  createAsyncThunk(
    "customerCollections/load",

    async (
      _,
      {
        dispatch,
        rejectWithValue,
      },
    ) => {
      try {
        const [
          cartItems,
          wishlistItems,
        ] =
          await Promise.all([
            loadCustomerCart(),
            loadCustomerWishlist(),
          ]);

        dispatch(
          replaceCartItems(
            cartItems,
          ),
        );

        dispatch(
          replaceWishlistItems(
            wishlistItems,
          ),
        );

        return {
          cartItems,
          wishlistItems,
        };
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.detail
            || error.message
            || (
              "Unable to load cart "
              + "and wishlist."
            ),
        );
      }
    },
  );