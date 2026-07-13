import React from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Heart, ShoppingBag, X } from "lucide-react";
import toast from "react-hot-toast";

import ProductCard from "@/storefront/components/product/ProductCard";

import { removeFromWishlist } from "@/storefront/store/wishlistSlice";

import { useProductBySlug } from "@/storefront/hooks/useProducts";

/* =====================================================
   WISHLIST PAGE
===================================================== */

export default function WishlistGrid() {
  const dispatch = useDispatch();

  const items = useSelector((state) => state.wishlist.items);

  /* ===================================================
     EMPTY WISHLIST
  =================================================== */

  if (items.length === 0) {
    return (
      <div
        className="
          mx-auto
          flex
          min-h-[60vh]
          w-full
          max-w-[1400px]
          flex-col
          items-center
          justify-center
          gap-4
          px-4
          py-20
          text-center
          sm:px-6
          lg:px-8
        "
      >
        {/* Heart icon */}

        <div
          className="
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            bg-surface
          "
        >
          <Heart size={28} className="text-muted" />
        </div>

        {/* Title */}

        <h1
          className="
            font-display
            text-xl
            font-bold
            text-app
          "
        >
          Your wishlist is empty
        </h1>

        {/* Description */}

        <p
          className="
            max-w-sm
            text-sm
            leading-relaxed
            text-muted
          "
        >
          Tap the heart icon on any product to save it here for later.
        </p>

        {/* Products button */}

        <Link
          to="/products"
          className="
            inline-flex
            items-center
            justify-center
            rounded-full
            bg-brand-500
            px-6
            py-3
            text-sm
            font-semibold
            text-white
            shadow-glow-sm
            transition-colors
            hover:bg-brand-600
          "
        >
          <ShoppingBag size={16} className="mr-2" />
          Browse Products
        </Link>
      </div>
    );
  }

  /* ===================================================
     WISHLIST PRODUCTS
  =================================================== */

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-[1400px]
        px-4
        py-8
        sm:px-6
        sm:py-12
        lg:px-8
      "
    >
      {/* Page title */}

      <div className="mb-8">
        <h1
          className="
            font-display
            text-2xl
            font-bold
            text-app
            sm:text-3xl
          "
        >
          My Wishlist
        </h1>

        <p className="mt-1 text-sm text-muted">
          {items.length}
          {items.length === 1 ? " saved product" : " saved products"}
        </p>
      </div>

      {/* =================================================
          SAME GRID AS PRODUCTS PAGE
      ================================================= */}

      <div
        className="
          grid
          grid-cols-2
          gap-x-4
          gap-y-8
          sm:grid-cols-3
          sm:gap-x-5
          lg:grid-cols-4
        "
      >
        {items.map((item) => (
          <WishlistProduct
            key={item.productId}
            item={item}
            dispatch={dispatch}
          />
        ))}
      </div>
    </main>
  );
}

/* =====================================================
   GET LIVE PRODUCT

   ProductCard receives the complete product object.
   Therefore its design, price, rating, discount,
   wishlist and Add to Cart button remain the same.
===================================================== */

function WishlistProduct({ item, dispatch }) {
  const { data: liveProduct, isLoading, isError } = useProductBySlug(item.slug);

  /* ===================================================
     LOADING CARD

     Same image ratio as ProductCard
  =================================================== */

  if (isLoading) {
    return (
      <div className="w-full animate-pulse">
        {/* Image skeleton */}

        <div
          className="aspect-[8/9] w-full bg-surface"/>

        {/* Product information skeleton */}

        <div
          className="
            flex
            flex-col
            gap-2
            py-3
          "
        >
          <div
            className="
              h-2
              w-20
              rounded-full
              bg-surface
            "
          />

          <div
            className="
              h-5
              w-3/4
              rounded-full
              bg-surface
            "
          />

          <div
            className="
              h-5
              w-24
              rounded-full
              bg-surface
            "
          />
        </div>
      </div>
    );
  }

  /* ===================================================
     PRODUCT REMOVED / UNPUBLISHED
  =================================================== */

  if (isError || !liveProduct) {
    return <UnavailableWishlistCard item={item} dispatch={dispatch} />;
  }

  /* ===================================================
     REUSE ORIGINAL PRODUCT CARD

     This gives exactly the same:
     ✓ Frame
     ✓ Image size
     ✓ Image ratio
     ✓ Product title
     ✓ Rating
     ✓ Price
     ✓ Discount
     ✓ Wishlist button
     ✓ Add to Cart button
     ✓ Hover animation
  =================================================== */

  return <ProductCard product={liveProduct} />;
}

/* =====================================================
   UNAVAILABLE PRODUCT
===================================================== */

function UnavailableWishlistCard({ item, dispatch }) {
  const handleRemove = () => {
    dispatch(removeFromWishlist(item.productId));

    toast.success("Removed from wishlist");
  };

  return (
    <div
      className="
        group
        relative
        flex
        w-full
        flex-col
        opacity-60
      "
    >
      {/* Remove button */}

      <button
        type="button"
        onClick={handleRemove}
        aria-label="Remove unavailable product"
        className="
          absolute
          right-2
          top-2
          z-10
          rounded-full
          bg-app/80
          p-2
          text-app
          shadow-sm
          backdrop-blur-sm
          transition-colors
          hover:bg-app
        "
      >
        <X size={16} />
      </button>

      {/* Same ProductCard image size */}

      <div
        className="
          flex
          aspect-[8/9]
          w-full
          flex-col
          items-center
          justify-center
          bg-surface
          px-5
          text-center
        "
      >
        <ShoppingBag
          size={28}
          className="
            mb-3
            text-muted
          "
        />

        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-muted
          "
        >
          No longer available
        </p>
      </div>

      {/* Product information */}

      <div
        className="
          flex
          flex-col
          gap-1
          py-3
        "
      >
        <h3
          className="
            line-clamp-2
            text-lg
            font-thin
            leading-snug
            text-muted
          "
        >
          {item.title}
        </h3>

        <span
          className="
            text-xs
            text-muted
          "
        >
          This product may have been removed or unpublished.
        </span>
      </div>
    </div>
  );
}
