import React, { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Heart, ShoppingBag, Star } from "lucide-react";
import clsx from "clsx";
import { getImageUrl, formatPrice } from "@/shared/utils/productUtils";
import {
  toggleWishlist,
  selectIsWishlisted,
} from "@/storefront/store/wishlistSlice";
import { addToCart } from "@/storefront/store/cartSlice";
import toast from "react-hot-toast";

function ProductCard({ product }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, customer } = useSelector((s) => s.customer);
  const isWishlisted = useSelector(selectIsWishlisted(product.id));

  const variants = product.variants || [];
  const inStock = (product.total_stock ?? 0) > 0;
  const minPrice = product.min_price;
  const availableVariant =
    variants.find((variant) => Number(variant.stock_quantity) > 0) || null;

  const firstVariant = availableVariant || variants[0];
  const priceVariant = availableVariant || variants[0];

  const hasDiscount =
    priceVariant &&
    Number(priceVariant.original_price) >
    Number(priceVariant.selling_price);
  const discountPct = hasDiscount
    ? Math.round(
        ((Number(firstVariant.original_price) -
          Number(firstVariant.selling_price)) /
          Number(firstVariant.original_price)) *
          100,
      )
    : 0;

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

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!availableVariant) {
      toast.error("Out of stock");
      return;
    }
    dispatch(
      addToCart({
        productId: product.id,
        slug: product.slug,
        title: product.title,
        thumbnail: product.thumbnail,
        size: availableVariant.size,
        color: availableVariant.color || null,
        colorHex: availableVariant.color_hex || null,
        sellingPrice: Number(availableVariant.selling_price),
        originalPrice: Number(availableVariant.original_price),
        stockQuantity: availableVariant.stock_quantity,
        quantity: 1,
      }),
    );
    const isAuthenticated = !!(token && customer);
    const toastShown = sessionStorage.getItem("aurastore_guest_added_toast_shown");
    if (!isAuthenticated && !toastShown) {
      sessionStorage.setItem("aurastore_guest_added_toast_shown", "true");
      toast.custom((t) => (
        <div
          className={clsx(
            "max-w-md w-full bg-app border border-app shadow-lg rounded-2xl pointer-events-auto flex overflow-hidden transition-all duration-350",
            t.visible ? "animate-fade-in opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          <div className="flex-1 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5 text-green-500 font-bold text-base">
                ✓
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-app">
                  Added to Cart
                </p>
                <p className="mt-0.5 text-xs text-muted leading-relaxed">
                  Sign in to save your cart across devices and enjoy faster checkout.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-app shrink-0">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate("/login");
              }}
              className="w-24 border border-transparent rounded-none p-4 flex items-center justify-center text-xs font-semibold text-brand-500 hover:bg-surface hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Sign In
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    } else {
      toast.success("Added to cart");
    }
  };

  const [imageError, setImageError] = React.useState(false);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col w-full justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="flex relative w-full aspect-[8/9] rounded-0 bg-surface overflow-hidden">
        {product.thumbnail && !imageError ? (
          <img
            src={getImageUrl(product.thumbnail)}
            alt={product.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-400 p-4 text-center text-[10px] uppercase font-bold tracking-wider">
            <ShoppingBag className="w-6 h-6 mb-1 text-zinc-500" />
            <span className="line-clamp-2">{product.title}</span>
          </div>
        )}

        <div className="absolute flex flex-wrap flex-row w-full items-center justify-between mt-2 px-2">
          {/* Badges */}
          <div className="flex flex-col gap-1.5">

            {!inStock && (
              <span className="bg-gray-700/20 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
                Out of Stock
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            aria-label="Toggle wishlist"
            aria-pressed={isWishlisted}
            className="p-2 rounded-full bg-app/80 backdrop-blur-sm hover:bg-gray-200/20 text-app transition-colors duration-200 shadow-sm"
          >
            <Heart
              size={16}
              className={clsx(
                isWishlisted ? "fill-red-500 text-red-500" : "text-app",
              )}
            />
          </button>
        </div>

        
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 flex-wrap h-full justify-between gap-1 py-3">
        {(product.collection_name || product.collection) && (
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            {product.collection_name || product.collection}
          </span>
        )}
        <div className="flex flex-row flex-wrap items-center justify-between">
          <h3 className="text-lg font-thin text-app line-clamp-2 leading-snug">
            {product.title}
          </h3>

          <div className="flex items-center border rounded-md w-fit gap-1.5 p-1">
            <span className="text-[13px] text-app">4.5</span>
            <Star size={13} className="fill-green-600 text-green-600" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between">
          {minPrice != null ? (
            <>
              <span className="text-xl font-bold text-app">
                {formatPrice(minPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted line-through">
                  {formatPrice(priceVariant.original_price)}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted">Price unavailable</span>
          )}
          {hasDiscount && (
            <span className="text-red-500 w-fit text-[13px] font-extralight uppercase tracking-wide px-2 py-1 rounded-full">
              {discountPct}%
            </span>
          )}
        </div>
      </div>
          {/* Quick add */}
      <button
        onClick={handleQuickAdd}
        disabled={!inStock}
        className={clsx(
          "absolute bottom-0 right-0 p-2.5 w-full text-sm  uppercase flex flex-row gap-3 items-center bg-zinc-950 dark:bg-zinc-900 text-white justify-center rounded-md duration-300",
          "translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
          // inStock
          //   ? "bg-brand-500 hover:bg-brand-600 text-white"
          //   : "bg-gray-500/65 text-white cursor-not-allowed",
        )}
        aria-label="Quick add to cart"
      >
        <ShoppingBag size={16} />
        Add to Cart
      </button>
    </Link>
  );
}

export default memo(ProductCard, (prev, next) => {
  const a = prev.product;
  const b = next.product;

  return (
    a.id === b.id &&
    a.slug === b.slug &&
    a.title === b.title &&
    a.thumbnail === b.thumbnail &&
    a.min_price === b.min_price &&
    a.total_stock === b.total_stock &&
    a.is_featured === b.is_featured
  );
});