import React, { memo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Heart, ShoppingBag, Star } from "lucide-react";
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
  const isWishlisted = useSelector(selectIsWishlisted(product.id));
  const { settings } = useStoreSettings();


  const minPrice = product.selling_price_min;
  const maxPrice = product.selling_price_max;

  const originalMin = product.original_price_min;
  const originalMax = product.original_price_max;

  const hasDiscount =
  Number(originalMin) > Number(minPrice);

  const discountPct =
    product.discount_percentage ??
    product.discount ??
    (hasDiscount
      ? Math.round(
          ((Number(originalMin) - Number(minPrice)) /
            Number(originalMin)) *
            100
        )
      : 0);

//   const discountPct =
//     product.discount_percentage ??
//     product.discount ??
//     (
//         hasDiscount
//         ? Math.round(
//             ((Number(originalMin) - Number(minPrice)) /
//                 Number(originalMin)) *
//                 100
//             )
//         : 0
//     );
  
  

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(
      toggleWishlist({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        thumbnail: product.thumbnail,
        minPrice: product.selling_price_min
      }),
    );
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  };



  const [imageError, setImageError] = React.useState(false);
  console.log(product);
  console.log("Discount %:", product.discount_percentage);
  console.log("Discount:", product.discount);
  console.log("Original Min:", product.original_price_min);
  console.log("Selling Min:", product.selling_price_min);

  return (
    <Link
      to={`/custom/${product.id}`}
      className="group relative flex flex-col w-full justify-between overflow-hidden rounded-none transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="flex relative w-full aspect-[8/9] rounded-none bg-surface overflow-hidden">
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
            {product.is_featured && (
              <span className="bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
                Featured
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

        <div className="flex items-start justify-between">

            {minPrice != null ? (

                <>

                    <div className="flex flex-col gap-1">

                        <span className="text-xl font-bold text-app">

                            {formatPrice(minPrice)}

                            {maxPrice &&
                                ` - ${formatPrice(maxPrice)}`}

                        </span>

                        {hasDiscount && (

                            <span className="text-xs line-through text-muted">

                                {formatPrice(originalMin)}

                                {originalMax &&
                                    ` - ${formatPrice(originalMax)}`}

                            </span>

                        )}

                    </div>

                    {hasDiscount && (

                        <span className="text-red-500 w-fit text-[13px] font-extralight uppercase tracking-wide px-2 py-1 rounded-full">

                            {discountPct}% 

                        </span>

                    )}

                </>

            ) : (

                <span className="text-xs text-muted">

                    Price unavailable

                </span>

            )}

        </div>
      </div>
          {/* Quick add */}

      
      <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            const storeName = settings?.store_name || "My Designers";
            const productName = product.title || "";
            const categoryName = product.custom_category_name || product.category_name || "";
            const productCode = product.sku || product.code || "";
            const productUrl = product.id ? `${window.location.origin}/custom/${product.id}` : "";

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

            const rawNumber = settings?.support_phone || import.meta.env.VITE_WHATSAPP_NUMBER || "";
            const cleanNumber = rawNumber.replace(/\D/g, "");
            const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

            if (!formattedNumber) {
              toast.error("WhatsApp contact number is not configured.");
              return;
            }

            const isMobile =
              /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
            "duration-300"
          )}
        >
          <ShoppingBag size={16} />
          Chat on WhatsApp
      </button>
    </Link>
  );
}

export default memo(CustomProductCard,(prev,next)=>{

const a=prev.product;
const b=next.product;

return(

a.id===b.id &&

a.title===b.title &&

a.thumbnail===b.thumbnail &&

a.selling_price_min===b.selling_price_min &&

a.selling_price_max===b.selling_price_max &&

a.original_price_min===b.original_price_min &&

a.original_price_max===b.original_price_max

);

});

