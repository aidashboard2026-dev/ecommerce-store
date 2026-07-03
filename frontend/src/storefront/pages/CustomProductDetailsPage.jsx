import { useParams } from "react-router-dom";
import { products } from "@/shared/data/products";
import { Link } from "react-router-dom";


import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "@/storefront/store/cartSlice";
import { toggleWishlist } from "@/storefront/store/wishlistSlice";

import toast from "react-hot-toast";

import axios from "axios";
import React, { useState, useEffect } from "react";

export default function ProductDetailsPage() {


  const dispatch = useDispatch();
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const wishlistItems = useSelector(
    (state) => {
          return state.wishlist.items;
    }
  );



  const isWishlisted = product
    ? wishlistItems.some(
      (item) => item.productId === product.id
    )
  : false;


  

 
  useEffect(() => {

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || "/api/v1"}/custom-products/${id}`
            );

            const item = response.data;

            setProduct({
                id: item.id,
                name: item.title,
                image: item.thumbnail,

                sellingMinPrice: Number(item.selling_price_min),
                sellingMaxPrice: Number(item.selling_price_max),

                originalMinPrice: Number(item.original_price_min),
                originalMaxPrice: Number(item.original_price_max),

                description: item.description,
                category: item.category_name || "General",
                stock: item.stock_quantity,
                rating: 4.5,
            });


            const relatedResponse = await axios.get(
                `${import.meta.env.VITE_API_URL || "/api/v1"}/custom-products`
            );

            const related = relatedResponse.data.items
                .filter(
                    (p) =>
                        p.id !== item.id &&
                        p.category_name === item.category_name
                )
                .map((p) => ({
                    id: p.id,
                    name: p.title,
                    image: p.thumbnail,

                    sellingMin: Number(p.selling_price_min),
                    sellingMax: Number(p.selling_price_max),

                    originalMin: Number(p.original_price_min),
                    originalMax: Number(p.original_price_max),

                    category: p.category_name || "General",
                    stock: p.stock_quantity,
                    rating: 4.5,
                }))

            setRelatedProducts(related);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    fetchProduct();

    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });

  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-app">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <h1 className="text-center text-2xl mt-10 text-app font-semibold">
        Product Not Found
      </h1>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <p className="text-sm text-gray-500 mb-8">
            Home / Shop / {product.name}
        </p>

        <div className="grid lg:grid-cols-2 gap-12">

            {/* Product Image */}
            <div>
            <img
                src={product.image}
                alt={product.name}
                className="
                w-full
                h-[650px]
                object-cover
                rounded-3xl
                border
                shadow-sm
                "
            />
            </div>

            {/* Product Info */}
            <div>

            {/* Category */}
            <p className="uppercase text-indigo-500 font-bold tracking-widest mb-3">
                {product.category}
            </p>

            {/* Product Name */}
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
                {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-5">

                <div className="text-yellow-500 text-xl">
                ⭐⭐⭐⭐⭐
                </div>

                <span className="text-gray-600">
                4.5 (128 reviews)
                </span>

            </div>

            {/* Description */}
            <p className="text-gray-600 leading-7 mb-8">
                {product.description}
            </p>

            {/* Price */}
            <div className="flex flex-col gap-2">

                <div className="text-5xl font-bold text-indigo-600">

                    ₹{product.sellingMinPrice}

                    {product.sellingMaxPrice !== product.sellingMinPrice && (
                        <> – ₹{product.sellingMaxPrice}</>
                    )}

                </div>

                <div className="text-2xl text-gray-400 line-through">

                    ₹{product.originalMinPrice}

                    {product.originalMaxPrice !== product.originalMinPrice && (
                        <> – ₹{product.originalMaxPrice}</>
                    )}

                </div>

            </div>

            {/* Size */}
            <div className="mb-8">

                <h3 className="font-bold uppercase mb-3">
                Size
                </h3>

                <button
                className="
                    px-6
                    py-3
                    bg-indigo-500
                    text-white
                    rounded-xl
                    font-semibold
                "
                >
                All Size 
                </button>

            </div>

            {/* Color */}
            <div className="mb-8">

                {/* <h3 className="font-bold uppercase mb-3">
                Color
                </h3> */}

                {/* <div
                className="
                    w-12
                    h-12
                    rounded-full
                    border-4
                    border-indigo-500
                    bg-black
                "
                /> */}

            </div>

            {/* Stock */}
            <div className="mb-8">
                <span className="text-green-600 font-semibold">
                In Stock (64 available)
                </span>
            </div>

            {/* Quantity */}
            <div className="mb-8">

                {/* <h3 className="font-bold uppercase mb-3">
                Quantity
                </h3> */}

                {/* <div
                className="
                    flex
                    items-center
                    gap-6
                    border
                    rounded-xl
                    w-fit
                    px-5
                    py-3
                "
                >
                <button>-</button>
                <span>1</span>
                <button>+</button>
                </div> */}

            </div>

            {/* Buttons */}


                <div className="w-full mt-6">
                    <button
                        onClick={() => {
                            const productUrl =
                                `${window.location.origin}/product/${product.id}`;

                            const message = encodeURIComponent(`
                🛍 Product: ${product.name}

                💰 Price: ₹${product.sellingMinPrice}

                🏷 Original Price: ₹${product.originalMaxPrice}

                📂 Category: ${product.category}

                🖼 Image:
                ${product.image}

                🔗 View Product:
                ${productUrl}
                            `);

                            window.open(
                                `https://web.whatsapp.com/send?phone=918778021610&text=${message}`,
                                "_blank"
                            );
                        }}
                        className="
                            w-full
                            bg-green-500
                            hover:bg-green-600
                            text-white
                            py-4
                            rounded-2xl
                            font-bold
                            text-lg
                            transition-all
                            duration-300
                        "
                    >
                        WhatsApp
                    </button>
                </div>

            {/* </div> */}

        </div>

    </div>



      {/* Related Products */}

      <h2 className="text-4xl font-bold mb-8 mt-16">
        Related Products
      </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {relatedProducts.map((product) => {

            const discount =
                product.originalMax > 0
                    ? Math.round(
                        (
                            (product.originalMax - product.sellingMin) /
                            product.originalMax
                        ) * 100
                    )
                    : 0;

            return (
            <Link
                to={`/product/${product.id}`}
                key={product.id}
                className="
                group
                relative
                bg-white
                rounded-2xl
                border
                border-gray-200
                overflow-hidden
                hover:shadow-2xl
                transition-all
                duration-300
                hover:-translate-y-1
                "
            >

                {/* Featured */}
                <div className="absolute top-3 left-3 z-20">
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    FEATURED
                </span>
                </div>

                {/* Discount */}
                <div className="absolute top-12 left-3 z-20">
                <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    {discount}% OFF
                </span>
                </div>

                {/* Wishlist */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const exists = wishlistItems.some(
                        (item) => item.productId === product.id
                        );

                        dispatch(
                        toggleWishlist({
                            productId: product.id,
                            title: product.name,
                            thumbnail: product.image,
                            minPrice: product.sellingMin,
                        })
                        );

                        toast.success(
                        exists
                            ? "Removed from wishlist"
                            : "Added to wishlist"
                        );
                    }}
                    className="
                        absolute
                        top-3
                        right-3
                        z-50
                        p-2
                        rounded-full
                        bg-white
                        shadow-lg
                    "
                    >
                    {wishlistItems.some(
                        (item) => item.productId === product.id
                    )
                        ? "❤️"
                        : "🤍"}
                </button>

                {/* Image */}
                <div className="overflow-hidden">
                <img
                    src={product.image}
                    alt={product.name}
                    className="
                    w-full
                    h-80
                    object-cover
                    transition-transform
                    duration-500
                    group-hover:scale-105
                    "
                />
                </div>

                {/* Content */}
                <div className="p-4">

                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                    {product.category}
                </p>

                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                    {product.name}
                </h3>

                <div className="flex items-center gap-1 mb-3">
                    ⭐
                    <span className="text-gray-500">
                    4.5
                    </span>
                </div>

                <div className="mt-2 space-y-1">

                    {/* Selling Price */}
                    <div
                        className="
                            text-[18px]
                            font-extrabold
                            text-indigo-600
                            leading-tight
                            min-h-[42px]
                            flex
                            items-center
                            whitespace-nowrap
                        "
                    >
                        ₹{product.sellingMin}

                        {product.sellingMax !== product.sellingMin && (
                            <> – ₹{product.sellingMax}</>
                        )}
                    </div>

                    {/* Original Price */}
                    <div
                        className="
                            text-lg
                            text-gray-400
                            line-through
                            leading-tight
                            min-h-[24px]
                            flex
                            items-center
                            whitespace-nowrap
                        "
                    >
                        ₹{product.originalMin}

                        {product.originalMax !== product.originalMin && (
                            <> – ₹{product.originalMax}</>
                        )}
                    </div>

                </div>


                </div>

                {/* Add To Cart
                <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    dispatch(
                    addToCart({
                        productId: product.id,
                        title: product.name,
                        thumbnail: product.image,
                        sellingPrice: product.price,
                        originalPrice: product.oldPrice,
                        quantity: 1,
                    })
                    );
                }}
                className="
                    absolute
                    bottom-4
                    right-4
                    bg-indigo-600
                    hover:bg-indigo-700
                    text-white
                    p-3
                    rounded-full
                    shadow-lg
                    z-50
                    opacity-0
                    group-hover:opacity-100
                    transition-all
                    duration-300
                "
                >
                🛒
                </button> */}

            </Link>
            );
        })}

        </div>

    </div>
  );
}