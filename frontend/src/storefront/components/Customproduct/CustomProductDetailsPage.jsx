import React, { useState, useEffect, useMemo } from "react";
import {  Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Heart,
  ShoppingBag,

  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  ClipboardList,

  Truck,
  
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";

import { getImageUrl, formatPrice } from "@/shared/utils/productUtils";

import {
  toggleWishlist,
  selectIsWishlisted,
} from "@/storefront/store/wishlistSlice";
import CustomProductCard from "./custom_product_card";
import { useCustomProducts } from "@/storefront/hooks/useProducts";

export default function CustomProductDetailsPage({ product }) {

  const dispatch = useDispatch();

  const isWishlisted = useSelector(selectIsWishlisted(product?.id));

  const [activeImage, setActiveImage] = useState(0);
 

  const [quantity, setQuantity] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [showFullDescription, setShowFullDescription] = useState(false);
  const handleImageError = (index) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const [open, setOpen] = useState("");

  const toggle = (section) => {
    setOpen((prev) => (prev === section ? "" : section));
  };

  // Reset selections when product changes
  useEffect(() => {
    setQuantity(1);
    setActiveImage(0);
  }, [product?.id]);

  // Related products — use the backend's priority-ordered related endpoint


  // Image gallery — build from all available image fields, deduplicated
    const images = useMemo(() => {

        const arr = [];

        if(product?.thumbnail){

            arr.push(product.thumbnail);

        }

        return arr;

    },[product]);

    const { data } = useCustomProducts();

    const relatedProducts = useMemo(() => {

    return (
        data?.items
        ?.filter((p) => p.id !== product?.id)
        ?.slice(0, 4) || []
    );

    }, [data, product?.id]);

  if (!product) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-app font-semibold mb-4">Product not found.</p>
        <Link to="/custom" className="text-brand-500 font-semibold text-sm">
          Back to Custom Orders
        </Link>
      </div>
    );
  }

  const inStock =
    (product?.stock_quantity ?? 0) > 0;
 


  const hasDiscount =
    Number(product.original_price_min) >
    Number(product.selling_price_min);

  const discountPct =
    hasDiscount
        ? Math.round(
            (
            (
                Number(product.original_price_min) -
                Number(product.selling_price_min)
            ) /
            Number(product.original_price_min)
            ) * 100
        )
        : 0;

    const handleWhatsApp = () => {
        const price =
            product.selling_price_max &&
            Number(product.selling_price_max) > Number(product.selling_price_min)
            ? `₹${product.selling_price_min} - ₹${product.selling_price_max} (Based on Size)`
            : `₹${product.selling_price_min}`;

        const message = `Hi, I want to customize "${product.title}".

        Price: ${price}

        Product:
        ${window.location.href}`;

        const isMobile =
            /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobile) {
            window.location.href =
            `https://wa.me/918778021610?text=${encodeURIComponent(message)}`;
        } else {
            window.location.href =
            `https://web.whatsapp.com/send?phone=918778021610&text=${encodeURIComponent(message)}`;
        }
    };
  const handleWishlist = () => {
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

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-app">
          Home
        </Link>

        <ChevronRight size={14} className="text-muted-foreground/60" />

        <Link to="/custom" className="transition-colors hover:text-app">
          Custom Orders
        </Link>

        {product.collection_name && (
          <>
            <ChevronRight size={14} className="text-muted-foreground/60" />
            <Link
              to={`/custom?collection=${encodeURIComponent(
                product.collection_name,
              )}`}
              className="transition-colors hover:text-app"
            >
              {product.collection_name}
            </Link>
          </>
        )}

        {product.category_name && (
          <>
            <ChevronRight size={14} className="text-muted-foreground/60" />
            <Link
              to={`/custom?collection=${encodeURIComponent(
                product.collection_name || "",
              )}&category=${encodeURIComponent(product.category_name)}`}
              className="transition-colors hover:text-app"
            >
              {product.category_name}
            </Link>
          </>
        )}


        <ChevronRight size={14} className="text-muted-foreground/60" />

        <span className="font-semibold text-app truncate max-w-xs sm:max-w-md">
          {product.title}
        </span>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-8">
        {/* Gallery */}
        <div className="flex flex-1 flex-col gap-3">
          <div
            className={clsx(
              "relative aspect-[4/4] w-full bg-surface rounded-2xl overflow-hidden border border-app cursor-zoom-in",
            )}
            onClick={() => setZoomed((z) => !z)}
          >
            {images.length > 0 && !imageErrors[activeImage] ? (
              <img
                src={getImageUrl(images[activeImage])}
                alt={product.title}
                onError={() => handleImageError(activeImage)}
                className={clsx(
                  "w-full h-full object-cover transition-transform duration-300",
                  zoomed ? "scale-150" : "scale-100",
                )}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-400 p-8 text-center text-xs uppercase font-bold tracking-wider">
                <ShoppingBag className="w-12 h-12 mb-2 text-zinc-500" />
                <span>{product.title}</span>
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage(
                      (i) => (i - 1 + images.length) % images.length,
                    );
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-app/80 hover:bg-app shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((i) => (i + 1) % images.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-app/80 hover:bg-app shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            <button
              onClick={handleWishlist}
              className="absolute top-3 left-3 p-2 rounded-full bg-app/80 backdrop-blur-sm hover:bg-gray-200/20 text-app transition-colors duration-200"
            >
              <Heart
                size={20}
                className={clsx(isWishlisted && "fill-red-500 text-red-500")}
              />
            </button>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={clsx(
                    "w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors",
                    activeImage === i ? "border-brand-500" : "border-app",
                  )}
                >
                  {!imageErrors[i] ? (
                    <img
                      src={getImageUrl(img)}
                      alt=""
                      onError={() => handleImageError(i)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                      <ShoppingBag size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-2 md:gap-2 lg:gap-5">
          {(product.collection_name || product.collection) && (
            <span className="text-xs uppercase tracking-wider text-brand font-bold">
              {product.collection_name || product.collection}
            </span>
          )}

          <h1 className="text-4xl font-semibold text-app leading-tight">
            {product.title}
          </h1>

           {product.short_description && (
                <p className="mt-2 text-base leading-6 text-muted">
                    {product.short_description}
                </p>
            )}

        

         <div className="flex flex-wrap items-baseline border-b pb-3 gap-3"></div>
            <div className="border-b border-app pb-5">

                <div className="flex items-start justify-between gap-6">

                    {/* Left */}

                    <div className="flex flex-col">

                        <div className="flex flex-wrap items-end gap-3">

                            <span className="text-4xl font-bold text-app">

                                {formatPrice(product.selling_price_min)}

                                {product.selling_price_max &&
                                    ` - ${formatPrice(product.selling_price_max)}`}

                            </span>

                            {hasDiscount && (

                                <span className="text-red-500 text-xl font-semibold">

                                    {discountPct}% OFF

                                </span>

                            )}

                        </div>

                        <span className="text-sm text-muted mt-1">

                            (Based on Size)

                        </span>

                        {hasDiscount && (

                            <span className="text-lg line-through text-muted mt-2">

                                {formatPrice(product.original_price_min)}

                                {product.original_price_max &&
                                    ` - ${formatPrice(product.original_price_max)}`}

                            </span>

                        )}

                        <span className="mt-3 text-sm font-medium text-pink-500">

                            ✔ All Sizes Available

                        </span>

                        <span className="mt-1 text-sm font-medium text-pink-500">

                            ✔ In Stock ({product.stock_quantity})

                        </span>

                    </div>

                </div>

            </div>

    
            
          
            <div className="flex flex-wrap gap-3 mt-6">
                <button
                    onClick={handleWhatsApp}
                    disabled={!inStock}
                    className={`
                    flex-1 w-full
                    flex items-center justify-center gap-3
                    rounded-xl
                    bg-[#1EBE5B]
                    hover:bg-[#25D366]
                    active:scale-[0.98]
                    transition-all duration-300
                    text-white
                    text-xl font-semibold
                    py-3
                    shadow-lg hover:shadow-xl
                    disabled:bg-gray-400 disabled:cursor-not-allowed
                    `}
                >
                    <ShoppingBag size={22} />
                    Chat on WhatsApp
                </button>
            </div>


            {/* Stock status */}
          {product.description && (

            <section className="border-b border-app pb-5">

                <h2 className="text-xl font-semibold text-app mb-3">

                    Description

                </h2>

                <p
                    className={clsx(
                        "text-base leading-7 text-muted whitespace-pre-line transition-all",
                        !showFullDescription && "line-clamp-2"
                    )}
                >
                    {product.description}
                </p>

                {product.description.length > 120 && (

                    <button
                        onClick={() =>
                            setShowFullDescription(!showFullDescription)
                        }
                        className="mt-2 text-pink-500 hover:text-pink-600 font-semibold"
                    >
                        {showFullDescription
                            ? "See Less"
                            : "See More"}
                    </button>

                )}

            </section>

            )}

          {/* Actions */}
          {/* <div className="flex flex-wrap gap-3 mt-2"> */}
            {/* <button
              onClick={handleWhatsApp}
              disabled={!inStock}
              className={clsx(
                "flex-1 p-2.5 w-full text-2xl flex flex-row gap-3 items-center bg-zinc-950 dark:bg-zinc-900 text-white justify-center rounded-md duration-300",
                // inStock
                //   ? "border border-brand-500 text-brand-500 hover:bg-brand-500/10"
                //   : "border border-app text-muted cursor-not-allowed",
              )}
            >
              <ShoppingBag size={22} /> Chat on WhatsApp
            </button> */}
            {/* <button
              onClick={handleBuyNow}
              disabled={!inStock}
              className={clsx(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-semibold transition-colors",
                inStock
                  ? "bg-brand-500 hover:bg-brand-600 text-white shadow-glow-sm"
                  : "bg-gray-400 text-white cursor-not-allowed",
              )}
            >
              <Zap size={16} /> Buy Now
            </button> */}
          {/* </div> */}

          {/* {product.description && (
            <section className="mt-8 border-b border-app pb-6">

                <h2 className="text-xl font-semibold text-app mb-3">
                    Description
                </h2>

                <p className="text-base leading-8 text-muted whitespace-pre-line">
                    {product.description}
                </p>

            </section>
        )} */}

          {/* <section className="border-t border-app pt-2">
            <h2 className="text-2xl lg:text-3xl  font-semibold text-app">
              Product Information
            </h2>

            
            <div className="border-b border-app">
              <button
                onClick={() => toggle("details")}
                className="flex w-full items-center justify-between py-5"
              >
                <div className="flex items-center gap-4">
                  <FileText size={22} />
                  <span className="text-lg font-medium">Product Details</span>
                </div>

                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    open === "details" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === "details" && (
                <div className="pb-6 pl-10 text-muted">
                  <div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {product.material ? (
                        <li>Material: {product.material}</li>
                      ) : (
                        <>
                          <li>Material & Care</li>
                          <li>Cotton Machine-wash</li>
                        </>
                      )}
                      <li>100% Original Products</li>
                      <li>Pay on delivery might be available</li>
                      <li>Easy 14 days returns and exchanges</li>
                      <li>Try & Buy might be available</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

       
            <div className="border-b border-app">
              <button
                onClick={() => toggle("specs")}
                className="flex w-full items-center justify-between py-5"
              >
                <div className="flex items-center gap-4">
                  <ClipboardList size={22} />
                  <span className="text-lg font-medium">Specifications</span>
                </div>

                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    open === "specs" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === "specs" && (
                <div className="pb-6 pl-10 text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 max-w-xs gap-y-2">
                    <span className="font-semibold text-app">Material</span>
                    <span>{product.material || "Not Specified"}</span>
                    <span className="font-semibold text-app">Category</span>
                    <span>{product.category_name || "General"}</span>
                    {product.collection_name && (
                      <>
                        <span className="font-semibold text-app">Collection</span>
                        <span>{product.collection_name}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-b border-app">
              <button
                onClick={() => toggle("shipping")}
                className="flex w-full items-center justify-between py-5"
              >
                <div className="flex items-center gap-4">
                  
                  <Truck size={22} />
                  <span className="text-lg font-medium">
                    Shipping & Returns
                  </span>
                </div>

                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    open === "shipping" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === "shipping" && (
                <div className="space-y-2 pb-2 pl-10 text-sm leading-2 text-muted-foreground">
                  <p>
                    We offer 5 days hassle-free returns and exchanges from the date of delivery.
                  </p>

                  <p>
                    Please ensure that the products you return are unused,
                    unworn and the original tags are intact.
                  </p>

                  <p>
                    Products are shipped from our warehouse within 24 hours of
                    order placement except on weekends or on public holidays.
                  </p>

                  <Link
                    to="/returns-policy"
                    className="inline-flex items-center gap-2 font-medium text-app hover:underline"
                  >
                    Please click here
                    <ExternalLink size={16} />
                  </Link>
                </div>
              )}
            </div>
          </section>*/}
        </div>
      </div> 

      {/* Related Products */}

        {relatedProducts.length > 0 && (

        <section className="mt-20">

            <div className="flex items-center justify-between mb-8">

                <h2 className="text-3xl font-bold">

                    Related Products

                </h2>

                <Link
                    to="/custom"
                    className="text-brand-500 font-semibold hover:underline"
                >
                    View All
                </Link>

            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">

                {relatedProducts.map((item) => (

                    <CustomProductCard

                        key={item.id}

                        product={item}

                    />

                ))}

            </div>

        </section>

        )}

      
    </div>
  );
}
