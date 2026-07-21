import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { useCheckoutAuthModal } from "@/storefront/layouts/StorefrontLayout";
import {
  useProductBySlug,
  useRelatedProducts,
} from "@/storefront/hooks/useProducts";
import { getImageUrl, formatPrice } from "@/shared/utils/productUtils";
import { addToCart, openCartDrawer } from "@/storefront/store/cartSlice";
import { addCustomerCartItemThunk } from "@/storefront/store/customerCartThunks";
import {
  toggleWishlist,
  selectIsWishlisted,
} from "@/storefront/store/wishlistSlice";
import ProductGrid from "@/storefront/components/home/ProductGrid";
import { PageContainer } from "@/shared/components/layout";

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, customer } = useSelector((s) => s.customer);
  const { openCheckoutAuthModal } = useCheckoutAuthModal();
  const buyNowButtonRef = useRef(null);
  const { data: product, isLoading, isError } = useProductBySlug(slug);
  const isWishlisted = useSelector(selectIsWishlisted(product?.id));

  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (index) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const [open, setOpen] = useState("details");

  const toggle = (section) => {
    setOpen((prev) => (prev === section ? "" : section));
  };

  // Reset selections when product changes
  useEffect(() => {
    if (product?.variants?.length) {
      setSelectedSize(product.variants[0].size);
      setSelectedColor(product.variants[0].color || null);
      setQuantity(1);
      setActiveImage(0);
    }
  }, [product?.id]);

 
  const variants = product?.variants || [];

  const sizes = useMemo(() => {
    const set = new Set();
    variants.forEach((v) => set.add(v.size));
    return Array.from(set);
  }, [variants]);

  const colorsForSize = useMemo(() => {
    const map = new Map();
    variants
      .filter((v) => v.size === selectedSize)
      .forEach((v) => {
        if (v.color) map.set(v.color, v.color_hex);
      });
    return Array.from(map.entries());
  }, [variants, selectedSize]);

  const activeVariant = useMemo(() => {
    return (
      variants.find(
        (v) =>
          v.size === selectedSize &&
          (colorsForSize.length === 0 || v.color === selectedColor),
      ) || variants.find((v) => v.size === selectedSize)
    );
  }, [variants, selectedSize, selectedColor, colorsForSize]);

  // Related products — use the backend's priority-ordered related endpoint
  const { data: relatedProducts = [] } = useRelatedProducts(slug, 4);

  // Image gallery — build from all available valid image fields, deduplicated
  const images = useMemo(() => {
    const seen = new Set();
    const result = [];
    const addImg = (url) => {
      if (
        url &&
        typeof url === "string" &&
        url.trim() !== "" &&
        !url.includes("placeholder-product.png") &&
        !seen.has(url)
      ) {
        seen.add(url);
        result.push(url);
      }
    };
    addImg(product?.thumbnail);
    addImg(product?.image_front);
    addImg(product?.image_back);
    (product?.gallery_images || []).forEach(addImg);
    (product?.images || []).forEach(addImg);
    return result;
  }, [product]);

  if (isLoading) {
    return (
      <PageContainer className="animate-pulse">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="aspect-square rounded-md bg-surface" />
          <div className="flex flex-col gap-4">
            <div className="h-4 w-1/3 bg-surface rounded" />
            <div className="h-8 w-2/3 bg-surface rounded" />
            <div className="h-6 w-1/4 bg-surface rounded" />
            <div className="h-24 w-full bg-surface rounded" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isError || !product) {
    return (
      <PageContainer className="py-20 text-center">
        <p className="text-app font-semibold mb-4">Product not found.</p>
        <Link to="/products" className="text-brand-500 font-semibold text-sm">
          Back to shop
        </Link>
      </PageContainer>
    );
  }

  const inStock = (activeVariant?.stock_quantity ?? 0) > 0;
  const hasDiscount =
    activeVariant &&
    Number(activeVariant.original_price) > Number(activeVariant.selling_price);
  const discountPct = hasDiscount
    ? Math.round(
        ((Number(activeVariant.original_price) -
          Number(activeVariant.selling_price)) /
          Number(activeVariant.original_price)) *
          100,
      )
    : 0;

  const buildCartItem = () => ({
    productId: product.id,
    slug: product.slug,
    title: product.title,
    thumbnail: product.thumbnail,
    size: activeVariant.size,
    color: activeVariant.color || null,
    colorHex: activeVariant.color_hex || null,
    sellingPrice: Number(activeVariant.selling_price),
    originalPrice: Number(activeVariant.original_price),
    stockQuantity: activeVariant.stock_quantity,
    quantity,
  });

  const handleAddToCart = async () => {
    if (!activeVariant) return;
    if (!inStock) {
      toast.error("This variant is out of stock");
      return;
    }

    const isAuthenticated = !!(token && customer);

    if (isAuthenticated) {
      try {
        const cartItem = {
          productId: product.id,
          variantId: activeVariant.id,
          title: product.title,
          slug: product.slug,
          thumbnail: product.thumbnail,
          size: activeVariant.size,
          color: activeVariant.color || null,
          colorHex: activeVariant.color_hex || null,
          sellingPrice: Number(activeVariant.selling_price),
          originalPrice: Number(activeVariant.original_price),
          stockQuantity: activeVariant.stock_quantity,
          quantity,
        };
        await dispatch(addCustomerCartItemThunk(cartItem)).unwrap();
      } catch (err) {
        toast.error(typeof err === 'string' ? err : 'Failed to add to cart');
        return;
      }
    } else {
      dispatch(addToCart(buildCartItem()));
    }

    dispatch(openCartDrawer());

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
                navigate("/auth/login");
              }}
              className="w-24 border border-transparent rounded-none p-4 flex items-center justify-center text-xs font-semibold text-brand-500 hover:bg-surface hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Sign In
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    } else if (isAuthenticated) {
      toast.success("Added to cart");
    } else {
      toast.success("Added to cart");
    }
  };

  const handleBuyNow = async () => {
    if (!activeVariant) return;
    if (!inStock) {
      toast.error("This variant is out of stock");
      return;
    }

    const isAuthenticated = !!(token && customer);

    if (isAuthenticated) {
      try {
        await dispatch(addCustomerCartItemThunk({
          productId: product.id,
          variantId: activeVariant.id,
          title: product.title,
          slug: product.slug,
          thumbnail: product.thumbnail,
          size: activeVariant.size,
          color: activeVariant.color || null,
          colorHex: activeVariant.color_hex || null,
          sellingPrice: Number(activeVariant.selling_price),
          originalPrice: Number(activeVariant.original_price),
          stockQuantity: activeVariant.stock_quantity,
          quantity,
        })).unwrap();
      } catch (err) {
        toast.error(typeof err === 'string' ? err : 'Failed to add to cart');
        return;
      }
    } else {
      dispatch(addToCart(buildCartItem()));
    }

    if (!isAuthenticated) {
      openCheckoutAuthModal(buyNowButtonRef.current);
      return;
    }

    navigate("/checkout");
  };

  const handleWishlist = () => {
    dispatch(
      toggleWishlist({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        thumbnail: product.thumbnail,
        minPrice: product.min_price,
      }),
    );
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  };

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link to="/" className="transition-colors hover:text-app">
          Home
        </Link>

        <ChevronRight size={14} className="text-muted" />

        <Link to="/products" className="transition-colors hover:text-app">
          Shop
        </Link>

        {product.collection_name && (
          <>
            <ChevronRight size={14} className="text-muted" />
            <Link
              to={`/products?collection=${encodeURIComponent(
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
            <ChevronRight size={14} className="text-muted" />
            <Link
              to={`/products?collection=${encodeURIComponent(
                product.collection_name || "",
              )}&category=${encodeURIComponent(product.category_name)}`}
              className="transition-colors hover:text-app"
            >
              {product.category_name}
            </Link>
          </>
        )}


        <ChevronRight size={14} className="text-muted" />

        <span className="font-semibold text-app truncate max-w-xs sm:max-w-md">
          {product.title}
        </span>
      </div>

    
       <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:gap-10 xl:gap-14">
        {/* Gallery */}
        <div className="flex min-w-0 flex-col gap-3">
          <div
            className={clsx(
              "relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-md border border-app bg-surface",
            )}
            onClick={() => setZoomed((z) => !z)}
          >
            {images.length > 0 && !imageErrors[activeImage] ? (
              <img
                src={getImageUrl(images[activeImage])}
                alt={product.title}
                onError={() => handleImageError(activeImage)}
                className={clsx(
                  "h-full w-full object-cover transition-transform duration-300",
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
                  className="focus-ring absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-app/80 p-2 shadow-sm hover:bg-app"
                  aria-label="Previous product image"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((i) => (i + 1) % images.length);
                  }}
                  className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-app/80 p-2 shadow-sm hover:bg-app"
                  aria-label="Next product image"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            <button
              onClick={handleWishlist}
              className="focus-ring absolute left-3 top-3 rounded-full bg-app/80 p-2 text-app backdrop-blur-sm transition-colors duration-200 hover:bg-gray-200/20"
              aria-label="Toggle wishlist"
              aria-pressed={isWishlisted}
            >
              <Heart
                size={20}
                className={clsx(isWishlisted && "fill-red-500 text-red-500")}
              />
            </button>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={clsx(
                    "focus-ring h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors sm:h-20 sm:w-20",
                    activeImage === i ? "border-brand-500" : "border-app",
                  )}
                  aria-label={`Show product image ${i + 1}`}
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
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {(product.collection_name || product.collection) && (
            <span className="text-xs uppercase tracking-wider text-brand font-bold">
              {product.collection_name || product.collection}
            </span>
          )}

          <h1 className="font-display text-2xl font-semibold leading-tight text-app sm:text-3xl lg:text-4xl">
            {product.title}
          </h1>

          {/* {product.description && (
            <p className="text-base font-thin text-app leading-relaxed">
              {product.description}
            </p>
          )} */}

          {activeVariant && (
            <div className="flex flex-wrap items-baseline gap-3 border-b border-app pb-4">
              <span className="text-3xl font-bold text-app sm:text-4xl">
                {formatPrice(activeVariant.selling_price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-muted line-through">
                    {formatPrice(activeVariant.original_price)}
                  </span>
                  <span className="text-sm font-bold text-red-500">
                    {discountPct}%
                  </span>
                </>
              )}
            </div>
          )}

          {/* Short Description */}
          {product.short_description && (
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line border-b border-app pb-4">
              {product.short_description}
            </p>
          )}

          {/* Size selection */}
          {sizes.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-app pb-4 sm:flex-row sm:items-center">
              <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted sm:w-24">Size</h4>
              <div className="flex-1 flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      setSelectedColor(null);
                      setQuantity(1);
                    }}
                    aria-pressed={selectedSize === size}
                    className={clsx(
                      "focus-ring min-h-9 min-w-9 rounded-md border px-3 py-1 text-sm font-semibold transition-colors",
                      selectedSize === size
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-app text-app hover:border-brand-500",
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selection */}
          {colorsForSize.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-app pb-4 sm:flex-row sm:items-center">
              <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted sm:w-24">Color</h4>
              <div className="flex flex-wrap gap-2">
                {colorsForSize.map(([color, hex]) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      setQuantity(1);
                    }}
                    title={color}
                    aria-label={`Color option: ${color}`}
                    aria-pressed={selectedColor === color}
                    className={clsx(
                      "focus-ring h-8 w-8 rounded-full border-2 transition-all",
                      selectedColor === color
                        ? "border-brand-500 scale-110"
                        : "border-app",
                    )}
                    style={{ backgroundColor: hex || "#ccc" }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stock status */}
          <div>
            {activeVariant ? (
              inStock ? (
                <span className="text-xs font-semibold text-green-600">
                  In Stock ({activeVariant.stock_quantity} available)
                </span>
              ) : (
                <span className="text-xs font-semibold text-red-500">
                  Out of Stock
                </span>
              )
            ) : (
              <span className="text-xs text-muted">
                Select options to check availability
              </span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted sm:w-24">Quantity</h4>
            <div className="flex h-11 w-fit items-center overflow-hidden rounded-md border border-app">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="focus-ring h-full px-4 text-app hover:bg-surface"
              >
                −
              </button>
              <span className="min-w-12 px-4 text-center text-sm font-semibold text-app">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(q + 1, activeVariant?.stock_quantity ?? 1),
                  )
                }
                aria-label="Increase quantity"
                className="focus-ring h-full px-4 text-app hover:bg-surface"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-1 flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (!inStock) {
                  toast.error("This product is out of stock.");
                  return;
                }

                handleAddToCart();
              }}
              className={clsx(
                "focus-ring flex h-12 w-full flex-1 flex-row items-center justify-center gap-3 rounded-md bg-zinc-950 px-5 text-base font-semibold text-white duration-300 hover:bg-zinc-800 dark:bg-zinc-900"
              )}
            >
              <ShoppingBag size={22} />
              Add to Cart
            </button>

            
            {/* <button
              ref={buyNowButtonRef}
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
          </div>

          <section className="border-t border-app pt-4">
            <h2 className="text-xl font-semibold text-app lg:text-2xl">
              Product Information
            </h2>

            {/* Product Details */}
            <div className="border-b border-app">
              <button
                onClick={() => toggle("details")}
                className="focus-ring flex w-full items-center justify-between py-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <FileText size={22} />
                  <span className="text-base font-medium sm:text-lg">Product Details</span>
                </div>

                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    open === "details" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === "details" && (
                <div className="pb-6 pl-0 text-muted sm:pl-10 space-y-4">
                  {product.description && (
                    <div className="text-sm text-app leading-relaxed whitespace-pre-line">
                      {product.description}
                    </div>
                  )}

                  <div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
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

            {/* Specifications */}
            <div className="border-b border-app">
              <button
                onClick={() => toggle("specs")}
                className="focus-ring flex w-full items-center justify-between py-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <ClipboardList size={22} />
                  <span className="text-base font-medium sm:text-lg">Specifications</span>
                </div>

                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    open === "specs" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === "specs" && (
                <div className="pb-6 pl-0 text-sm text-muted sm:pl-10">
                  <div className="grid max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
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

            {/* Shipping & Returns */}
            <div className="border-b border-app">
              <button
                onClick={() => toggle("shipping")}
                className="focus-ring flex w-full items-center justify-between py-5 text-left"
              >
                <div className="flex items-center gap-4">
                  {/* <PackageCheck size={22} /> */}
                  <Truck size={22} />
                  <span className="text-base font-medium sm:text-lg">
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
                <div className="space-y-2 pb-2 pl-0 text-sm leading-relaxed text-muted sm:pl-10">
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
          </section>
        </div>
      </div>
     

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-12 lg:mt-16">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-app mb-6">
            You May Also Like
          </h2>
          <ProductGrid products={relatedProducts} loading={false} />
        </section>
      )}
    </PageContainer>
  );
}
