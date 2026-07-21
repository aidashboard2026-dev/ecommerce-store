import React, { memo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Heart, MessageCircle, ShoppingBag, Star } from "lucide-react";
import clsx from "clsx";

import { getImageUrl, formatPrice } from "@/shared/utils/productUtils";

import {
  toggleWishlist,
  selectIsWishlisted,
} from "@/storefront/store/wishlistSlice";

import useStoreSettings from "@/shared/hooks/useStoreSettings";
import toast from "react-hot-toast";

function CustomProductCard({ product }) {
  const dispatch = useDispatch();
  const { settings } = useStoreSettings();
  const isWishlisted = useSelector(selectIsWishlisted(product.id));

  /* =====================================================
    PRICE
  ===================================================== */

  const minPrice = product.selling_price_min;
  const maxPrice = product.selling_price_max;

  const originalMin = product.original_price_min;
  const originalMax = product.original_price_max;

  const hasDiscount =
    minPrice != null &&
    originalMin != null &&
    Number(originalMin) > Number(minPrice);

  const calculatedDiscount = hasDiscount
    ? Math.round(
        ((Number(originalMin) - Number(minPrice)) / Number(originalMin)) * 100,
      )
    : 0;

  const discountPct =
    product.discount_percentage ?? product.discount ?? calculatedDiscount;

  /* =====================================================
    IMAGE
  ===================================================== */

  const [imageError, setImageError] = React.useState(false);

  /* =====================================================
    WISHLIST
  ===================================================== */

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();

    dispatch(
      toggleWishlist({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        thumbnail: product.thumbnail,
        minPrice: product.selling_price_min,
      }),
    );

    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  };

  /* =====================================================
    WHATSAPP
  ===================================================== */

  const handleWhatsApp = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const waNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "";

    if (!waNumber) {
      toast.error("WhatsApp number is unavailable");
      return;
    }

    /*
    Use the real product page URL.

    Do not use window.location.href because it may return
    the current home page or collection page.
    */

    const productUrl = `${window.location.origin}/custom/${product.id}`;

    const priceText = maxPrice
      ? `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
      : formatPrice(minPrice);

    const message = `Hi, I want to customize "${product.title}".

Price: ${priceText}

Product:
${productUrl}`;

    const encodedMessage = encodeURIComponent(message);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = `https://wa.me/${waNumber}?text=${encodedMessage}`;

      return;
    }

    window.location.href = `https://web.whatsapp.com/send?phone=${waNumber}&text=${encodedMessage}`;
  };

  return (
    <Link
      to={`/custom/${product.slug || product.id}`}
      className={clsx(
        "group relative",
        "flex flex-col",
        "h-full w-full min-w-0",
        "justify-between",
        "overflow-hidden",
        "rounded-md",
        "transition-all duration-300",
        "hover:-translate-y-1",
        "focus-ring",
      )}
    >
      {/* =================================================
          PRODUCT IMAGE
      ================================================= */}

      <div
        className={clsx(
          "relative flex",
          "w-full",
          "aspect-[4/5]",
          "overflow-hidden",
          "rounded-none",
          "bg-surface",
        )}
      >
        {product.thumbnail && !imageError ? (
          <img
            src={getImageUrl(product.thumbnail)}
            alt={product.title}
            loading="lazy"
            onError={() => {
              setImageError(true);
            }}
            className={clsx(
              "h-full w-full",
              "object-cover",
              "transition-transform",
              "duration-500",
              "group-hover:scale-105",
            )}
          />
        ) : (
          <div
            className={clsx(
              "flex h-full w-full",
              "flex-col",
              "items-center",
              "justify-center",
              "bg-gradient-to-br",
              "from-zinc-800",
              "to-zinc-950",
              "p-4",
              "text-center",
              "text-[10px]",
              "font-bold",
              "uppercase",
              "tracking-wider",
              "text-zinc-400",
            )}
          >
            <ShoppingBag className="mb-1 h-6 w-6 text-zinc-500" />

            <span className="line-clamp-2">{product.title}</span>
          </div>
        )}

        {/* ===============================================
            TOP BADGE AND WISHLIST
        =============================================== */}

        <div
          className={clsx(
            "absolute",
            "mt-2",
            "flex w-full",
            "flex-row",
            "items-center",
            "justify-between",
            "px-2",
          )}
        >
          {/* Featured badge */}

          <div className="flex flex-col gap-1.5">
            {product.is_featured && (
              <span
                className={clsx(
                  "rounded-full",
                  "bg-brand-500",
                  "px-2 py-1",
                  "text-[10px]",
                  "font-bold",
                  "uppercase",
                  "tracking-wide",
                  "text-white",
                )}
              >
                Featured
              </span>
            )}
          </div>

          {/* Wishlist */}

          <button
            type="button"
            onClick={handleWishlist}
            aria-label="Toggle wishlist"
            aria-pressed={isWishlisted}
            className={clsx(
              "rounded-full",
              "bg-app/80",
              "p-2",
              "text-app",
              "shadow-sm",
              "backdrop-blur-sm",
              "transition-colors",
              "duration-200",
              "hover:bg-gray-200/20",
            )}
          >
            <Heart
              size={16}
              className={clsx(isWishlisted ? "fill-red-500 text-red-500" : "text-app")}
            />
          </button>
        </div>
      </div>

      {/* =================================================
          PRODUCT INFORMATION
      ================================================= */}

      {/* PRODUCT INFORMATION */}

      <div className="flex min-h-[8.75rem] flex-1 flex-col justify-between gap-2 py-3">
        {/* Collection */}

        {(product.collection_name || product.collection) && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {product.collection_name || product.collection}
          </span>
        )}

        {/* Product title and rating */}

        <div className="flex min-w-0 flex-row flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-medium leading-snug text-app line-clamp-2 sm:text-base lg:text-lg lg:font-light">
            {product.title}
          </h3>

          <div className="flex w-fit items-center gap-1.5 rounded-md border p-1">
            <span className="text-[13px] text-app">4.5</span>

            <Star size={13} className="fill-green-600 text-green-600" />
          </div>
        </div>

        {/* Price */}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {minPrice != null ? (
            <>
              <span className="text-base font-bold text-app sm:text-lg lg:text-xl">
                {formatPrice(minPrice)}

                {maxPrice != null &&
                  Number(maxPrice) !== Number(minPrice) &&
                  ` - ${formatPrice(maxPrice)}`}
              </span>

              {hasDiscount && (
                <span className="text-xs text-muted line-through">
                  {formatPrice(originalMin)}

                  {originalMax != null &&
                    Number(originalMax) !== Number(originalMin) &&
                    ` - ${formatPrice(originalMax)}`}
                </span>
              )}

              {hasDiscount && Number(discountPct) > 0 && (
                <span className="w-fit rounded-full px-2 py-1 text-[13px] font-extralight uppercase tracking-wide text-red-500">
                  {discountPct}%
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted">Price unavailable</span>
          )}
        </div>
      </div>

      {/* =================================================
          WHATSAPP BUTTON

          Same position, size and animation as Add to Cart
      ================================================= */}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          const storeName = settings?.store_name || "My Designers";
          const productName = product.title || "";
          const categoryName =
            product.custom_category_name || product.category_name || "";
          const productCode = product.sku || product.code || "";
          const productUrl =
            product.slug || product.id
              ? `${window.location.origin}/custom/${product.slug || product.id}`
              : "";

          let message = `Hi ${storeName},\n\nI'm interested in this custom product.\n\nProduct:\n${productName}`;

          if (categoryName) {
            message += `\n\nCategory:\n${categoryName}`;
          }

          if (productCode) {
            message += `\n\nProduct Code:\n${productCode}`;
          }

          if (productUrl) {
            message += `\n\nProduct URL:\n${productUrl}`;
          }

          message += `\n\nPlease share the quotation.\n\nThank you.`;

          const rawNumber =
            settings?.support_phone ||
            import.meta.env.VITE_WHATSAPP_NUMBER ||
            "";
          const cleanNumber = rawNumber.replace(/\D/g, "");
          const formattedNumber =
            cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

          if (!formattedNumber) {
            toast.error("WhatsApp contact number is not configured.");
            return;
          }

          const isMobile = /Android|iPhone|iPad|iPod/i.test(
            navigator.userAgent,
          );

          const targetUrl = isMobile
            ? `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`
            : `https://web.whatsapp.com/send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;

          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }}
        className={clsx(
          "absolute bottom-0 right-0",
          "w-full p-2.5",
          "flex items-center justify-center gap-3",
          "bg-green-600 hover:bg-green-700 text-white",
          "uppercase text-sm",
          "rounded-none",
          "translate-y-12 opacity-0",
          "group-hover:translate-y-0 group-hover:opacity-100",
          "duration-300",
        )}
      >
        <ShoppingBag size={16} />
        Chat on WhatsApp
      </button>
    </Link>
  );
}

/* =====================================================
   MEMO COMPARISON
===================================================== */

export default memo(
  CustomProductCard,

  (prev, next) => {
    const a = prev.product;
    const b = next.product;

    return (
      a.id === b.id &&
      a.slug === b.slug &&
      a.title === b.title &&
      a.thumbnail === b.thumbnail &&
      a.selling_price_min === b.selling_price_min &&
      a.selling_price_max === b.selling_price_max &&
      a.original_price_min === b.original_price_min &&
      a.original_price_max === b.original_price_max &&
      a.discount_percentage === b.discount_percentage &&
      a.is_featured === b.is_featured
    );
  },
);
