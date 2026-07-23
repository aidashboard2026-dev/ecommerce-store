import {
  createAsyncThunk,
} from "@reduxjs/toolkit";

import {
  customerCartAPI,
} from "../services/customerCollectionService";

import {
  normalizeCartItem,
} from "../services/customerCollectionSync";


export const addCustomerCartItemThunk =
  createAsyncThunk(
    "customerCart/addItem",

    async (
      item,
      {
        rejectWithValue,
      },
    ) => {
      try {
        const productId =
          Number(
            item.productId
            ?? item.product_id,
          );

        const rawVariantId =
          item.variantId
          ?? item.variant_id
          ?? null;

        const variantId =
          rawVariantId
            ? Number(
                rawVariantId,
              )
            : null;

        const quantity =
          Math.max(
            1,
            Number(
              item.quantity
              ?? 1,
            ),
          );

        const response =
          await customerCartAPI
            .addItem({
              product_id:
                productId,

              variant_id:
                variantId,

              quantity,
            });

        return (
          normalizeCartItem(
            response.data,
          )
        );
      } catch (error) {
        return rejectWithValue(
          error.response
            ?.data
            ?.detail
          || "Unable to add item to cart.",
        );
      }
    },
  );


export const updateCustomerCartQuantityThunk =
  createAsyncThunk(
    "customerCart/updateQuantity",

    async (
      {
        cartItemId,
        quantity,
      },

      {
        rejectWithValue,
      },
    ) => {
      try {
        const response =
          await customerCartAPI
            .updateQuantity(
              cartItemId,
              quantity,
            );

        return (
          normalizeCartItem(
            response.data,
          )
        );
      } catch (error) {
        return rejectWithValue(
          error.response
            ?.data
            ?.detail
          || "Unable to update quantity.",
        );
      }
    },
  );


export const removeCustomerCartItemThunk =
  createAsyncThunk(
    "customerCart/removeItem",

    async (
      cartItemId,

      {
        rejectWithValue,
      },
    ) => {
      try {
        await customerCartAPI
          .removeItem(
            cartItemId,
          );

        return cartItemId;
      } catch (error) {
        return rejectWithValue(
          error.response
            ?.data
            ?.detail
          || "Unable to remove cart item.",
        );
      }
    },
  );