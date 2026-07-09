import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Heart,
  ShoppingBag,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  ClipboardList,
  Star,
  Truck,
  PackageCheck,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import {
  useProductBySlug,
  useRelatedProducts,
} from "@/storefront/hooks/useProducts";
import { getImageUrl, formatPrice } from "@/shared/utils/productUtils";
import { addToCart, openCartDrawer } from "@/storefront/store/cartSlice";
import {
  toggleWishlist,
  selectIsWishlisted,
} from "@/storefront/store/wishlistSlice";
import ProductGrid from "@/storefront/components/home/ProductGrid";

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, customer } = useSelector((s) => s.customer);
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

  const [open, setOpen] = useState("");

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

  // Image gallery — build from all available image fields, deduplicated
  const images = useMemo(() => {
    const seen = new Set();
    const result = [];
    const addImg = (url) => {
      if (url && !seen.has(url)) {
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
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-square bg-surface rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-4 w-1/3 bg-surface rounded" />
            <div className="h-8 w-2/3 bg-surface rounded" />
            <div className="h-6 w-1/4 bg-surface rounded" />
            <div className="h-24 w-full bg-surface rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-app font-semibold mb-4">Product not found.</p>
        <Link to="/products" className="text-brand-500 font-semibold text-sm">
          Back to shop
        </Link>
      </div>
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

  const handleAddToCart = () => {
    console.log("Variant :", activeVariant);
    console.log("Stock :", activeVariant?.stock_quantity);
    console.log("In Stock :", inStock);

    if (!activeVariant) return;
    if (!inStock) {
      toast.error("This variant is out of stock");
      return;
    }
    dispatch(addToCart(buildCartItem()));
    dispatch(openCartDrawer());

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

  const handleBuyNow = () => {
    if (!activeVariant) return;
    if (!inStock) {
      toast.error("This variant is out of stock");
      return;
    }
    dispatch(addToCart(buildCartItem()));
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
    <div className="mx-auto w-full max-w-[1400px] p-5 ">
      {/* Breadcrumb */}
      <div className="mb-5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-app">
          Home
        </Link>

        <ChevronRight size={14} className="text-muted-foreground/60" />

        <Link to="/products" className="transition-colors hover:text-app">
          Shop
        </Link>

        {product.collection_name && (
          <>
            <ChevronRight size={14} className="text-muted-foreground/60" />
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
            <ChevronRight size={14} className="text-muted-foreground/60" />
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


        <ChevronRight size={14} className="text-muted-foreground/60" />

        <span className="font-semibold text-app truncate max-w-xs sm:max-w-md">
          {product.title}
        </span>
      </div>

    
       <div className="flex flex-col md:flex-row  justify-between gap-10">
        {/* Gallery */}
        <div className="flex flex-1 flex-col gap-3">
          <div
            className={clsx(
              "relative aspect-square w-full bg-surface rounded-2xl overflow-hidden border border-app cursor-zoom-in",
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

          <h1 className="font-thin text-2xl sm:text-3xl text-app">
            {product.title}
          </h1>

          {/* {product.description && (
            <p className="text-base font-thin text-app leading-relaxed">
              {product.description}
            </p>
          )} */}

          {activeVariant && (
            <div className="flex flex-wrap items-baseline border-b pb-3 gap-3">
              <span className="text-4xl font-bold text-app">
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

          {/* Size selection */}
          {sizes.length > 0 && (
            <div className="border-b pb-3 flex gap-3 items-center">
              <h4 className="text-lg font-normal">Size</h4>
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
                      "min-w-[2rem] px-2 py-1 rounded-md border text-sm font-semibold transition-colors",
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
            <div className="border-b pb-3 flex  gap-8">
              <h4 className="text-lg font-normal">Color</h4>
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
                      "h-6 w-6 rounded-full border-0 transition-all",
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
          <div className="flex items-center gap-4">
            <h4 className="text-lg font-normal">Quantity</h4>
            <div className="flex items-center border border-app rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="px-3 py-1.5 text-app hover:bg-surface"
              >
                −
              </button>
              <span className="px-4 py-1.5 text-sm font-semibold text-app">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(q + 1, activeVariant?.stock_quantity ?? 1),
                  )
                }
                aria-label="Increase quantity"
                className="px-3 py-1.5 text-app hover:bg-surface"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className={clsx(
                "flex-1 p-2.5 w-full text-2xl flex flex-row gap-3 items-center bg-zinc-950 dark:bg-zinc-900 text-white justify-center rounded-md duration-300",
                // inStock
                //   ? "border border-brand-500 text-brand-500 hover:bg-brand-500/10"
                //   : "border border-app text-muted cursor-not-allowed",
              )}
            >
              <ShoppingBag size={22} /> Add to Cart
            </button>
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
          </div>

          <section className="border-t border-app pt-2">
            <h2 className="text-2xl lg:text-3xl  font-semibold text-app">
              Product Information
            </h2>

            {/* Product Details */}
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

            {/* Specifications */}
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

            {/* Shipping & Returns */}
            <div className="border-b border-app">
              <button
                onClick={() => toggle("shipping")}
                className="flex w-full items-center justify-between py-5"
              >
                <div className="flex items-center gap-4">
                  {/* <PackageCheck size={22} /> */}
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
          </section>
        </div>
      </div>
     

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-app mb-6">
            You May Also Like
          </h2>
          <ProductGrid products={relatedProducts} loading={false} />
        </section>
      )}
    </div>
  );
}
