import { Link } from "react-router-dom";
import { toggleWishlist, selectIsWishlisted } from '@/storefront/store/wishlistSlice'
import { addToCart } from '@/storefront/store/cartSlice'

import toast from "react-hot-toast";
import { products } from "@/shared/data/products";

import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
//   const dispatch = useDispatch()
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import axios from "axios";


export default function SubProductsPage() {
  const dispatch = useDispatch();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {

    try {

        const response = await axios.get(
            "http://localhost:8000/api/v1/custom-products"
        );

        const formattedProducts = response.data.items.map((item) => ({
            id: item.id,
            name: item.title,
            image: item.thumbnail,
            price: Number(item.selling_price_min),
            oldPrice: Number(item.original_price_max),
            category: item.category_name || "General",
            stock: item.stock_quantity,
            rating: 4.5,
        }));

        setProducts(formattedProducts);

    } catch (err) {

        console.log(err);

    } finally {

        setLoading(false);

    }

  };
  const wishlistItems = useSelector(
    (state) => state.wishlist.items
  );
 

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  
  
  const categories = [
    // "Round Neck T-Shirt",
    "Oversized T-Shirt",
    "Graphic Printed T-Shirt",
    "Back Print T-Shirt",
    "Embroidery Design T-Shirt",
    "Jersey",
    "Gifts & Printing",
    "Magic Mug Print",
    "Photo Frames",
    "Metal Frames",
    "Mouse Pads",
    "Personal Gifts",
    "White Mug",
    "Sublimation Products",
    "Water Bottles",
    "Skinny Tumblers",
    "Glass Ware",
    "Hats & Caps",
    "Wedding & Greeting Cards",
    "Pillows"
   ]
  
  
  
    
    const [filters, setFilters] = useState({
        collection: "",
        sort_by: "newest",
        min_price: "",
        max_price: "",
        rating: null,
        in_stock_only: false,
    });
    
    const filteredProducts = products.filter((product) => {

        // const isWishlisted = wishlistItems.some(
        //     (item) => item.productId === product.id
        // );

        const categoryMatch =
            selectedCategory === "All" ||
            product.category === selectedCategory;

        const searchMatch =
            (product.name || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

        let priceMatch = true;

        if (selectedPrice === "under500")
            priceMatch = product.price < 500;

        if (selectedPrice === "500to1000")
            priceMatch =
            product.price >= 500 &&
            product.price <= 1000;

        if (selectedPrice === "1000to2500")
            priceMatch =
            product.price >= 1000 &&
            product.price <= 2500;

        if (selectedPrice === "2500to5000")
            priceMatch =
            product.price >= 2500 &&
            product.price <= 5000;

        if (selectedPrice === "above5000")
            priceMatch = product.price > 5000;

        const ratingMatch =
            !selectedRating ||
            product.rating >= selectedRating;

        const stockMatch =
            !inStockOnly ||
            product.stock > 0;

        return (
            categoryMatch &&
            searchMatch &&
            priceMatch &&
            ratingMatch &&
            stockMatch
        );
    });

    useEffect(() => {

        fetchProducts();

    }, []);

    if (loading) {
        return (
            <div className="text-center py-10">
                Loading Products...
            </div>
        );
    }
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      <div className="mb-8">

        <h1 className="text-4xl font-bold text-app mb-2">
            Sub Products
        </h1>

        <p className="text-muted">
            Browse products by category
        </p>

      </div>

      <div className="mb-8">

        <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
                w-full
                h-12
                px-5
                rounded-2xl
                border
                border-gray-200
                bg-white
                outline-none
                focus:ring-2
                focus:ring-brand-500
                shadow-sm
            "
        />

      </div>

      <div className="flex gap-8">

        {/* Sidebar */}
        {/* Sidebar */}
        <aside className="w-72 bg-white rounded-2xl border border-gray-200 p-6 h-fit sticky top-24 shadow-sm">

            {/* Sort By */}
            <div className="mb-8">
                <h3 className="font-bold text-sm uppercase tracking-wide mb-4">
                Sort By
                </h3>

                <div className="space-y-3">

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sort" />
                    <span>Newest</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sort" />
                    <span>Price: Low to High</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sort" />
                    <span>Price: High to Low</span>
                </label>

                </div>
            </div>

            {/* Categories */}
            <div className="mb-8">
                <h3 className="font-bold text-sm uppercase tracking-wide mb-4">
                Category
                </h3>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === "All"}
                    onChange={() => setSelectedCategory("All")}
                    />
                    All Categories
                </label>

                {categories.map((category) => (
                    <label
                    key={category}
                    className="flex items-center gap-2 cursor-pointer"
                    >
                    <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === category}
                        onChange={() => setSelectedCategory(category)}
                    />
                    {category}
                    </label>
                ))}

                </div>
            </div>

            {/* Price */}
            <div className="mb-8">

                <h3 className="font-bold text-sm uppercase tracking-wide mb-4">
                    Price
                </h3>

                <div className="space-y-3">

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="price"
                        checked={selectedPrice === ""}
                        onChange={() => setSelectedPrice("")}
                    />
                    Any Price
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="price"
                        checked={selectedPrice === "under500"}
                        onChange={() => setSelectedPrice("under500")}
                    />
                    Under ₹500
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="price"
                        checked={selectedPrice === "500to1000"}
                        onChange={() => setSelectedPrice("500to1000")}
                    />
                    ₹500 – ₹1,000
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="price"
                        checked={selectedPrice === "1000to2500"}
                        onChange={() => setSelectedPrice("1000to2500")}
                    />
                    ₹1,000 – ₹2,500
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="price"
                        checked={selectedPrice === "2500to5000"}
                        onChange={() => setSelectedPrice("2500to5000")}
                    />
                    ₹2,500 – ₹5,000
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="price"
                        checked={selectedPrice === "above5000"}
                        onChange={() => setSelectedPrice("above5000")}
                    />
                    Above ₹5,000
                    </label>

                </div>

            </div>

           
            {/* Rating */}
            <div className="mb-8">

                <h3 className="font-bold text-sm uppercase tracking-wide mb-4">
                    Customer Rating
                </h3>

                <div className="space-y-3">

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="rating"
                        checked={selectedRating === 4}
                        onChange={() => setSelectedRating(4)}
                    />
                    4★ & Above
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="rating"
                        checked={selectedRating === 3}
                        onChange={() => setSelectedRating(3)}
                    />
                    3★ & Above
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="rating"
                        checked={selectedRating === 2}
                        onChange={() => setSelectedRating(2)}
                    />
                    2★ & Above
                    </label>

                </div>

            </div>
            {/* Availability */}
            <div className="mb-8">

                <h3 className="font-bold text-sm uppercase tracking-wide mb-4">
                    Availability
                </h3>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    In Stock Only
                </label>

            </div>

            <button
                onClick={() => {
                    setSelectedCategory("All");
                    setSelectedPrice("");
                    setSelectedRating("");
                    setInStockOnly(false);
                    setSearchTerm("");
                }}
                className="text-brand-500 font-medium"
                >
                Clear All Filters
            </button>

        </aside>

        {/* Products */}
        <div className="flex-1">

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {filteredProducts.map((product) => {
            const isWishlisted = wishlistItems.some(
                (item) => item.productId === product.id
            );

            const discount = Math.round(
                ((product.oldPrice - product.price) / product.oldPrice) * 100
            )

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

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            dispatch(
                            toggleWishlist({
                                productId: product.id,
                                title: product.name,
                                thumbnail: product.image,
                                minPrice: product.price,
                            })
                            );

                            if (isWishlisted) {
                            toast.success("Removed from Wishlist");
                            } else {
                            toast.success("Added to Wishlist");
                            }
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
                        {isWishlisted ? "❤️" : "🤍"}
                    </button>
                    {/* Quick add
                    <button
                      onClick={handleQuickAdd}
                      disabled={!inStock}
                      className={clsx(
                        'absolute bottom-3 right-3 p-2.5 rounded-full shadow-glow-sm transition-all duration-300',
                        'translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
                        inStock
                        ? 'bg-brand-500 hover:bg-brand-600 text-white'
                        : 'bg-gray-400 text-white cursor-not-allowed'
                      )}
                    aria-label="Quick add to cart"
                    >
                    <ShoppingBag size={16} />
                    </button> */}

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

                        <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-brand-500">
                            ₹{product.price}
                        </span>

                        <span className="line-through text-gray-400">
                            ₹{product.oldPrice}
                        </span>
                        </div>

                    </div>

                    {/* Hover Buttons */}
                    {/* <div
                        className="
                        absolute
                        bottom-4
                        left-4
                        right-4
                        flex
                        gap-2
                        opacity-0
                        translate-y-5
                        group-hover:opacity-100
                        group-hover:translate-y-0
                        transition-all
                        duration-300
                        "
                    >

                        {/* <button
                        onClick={() => dispatch(addToCart(product))}
                        className="
                            flex-1
                            bg-brand-500
                            hover:bg-brand-600
                            text-white
                            py-3
                            rounded-xl
                            font-semibold
                        "
                        >
                        Add To Cart
                        </button> */}

                        {/* <button
                            onClick={(e) => {
                               
                                toast.success("Added to cart succusssfully");
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
                                bottom-3
                                right-3
                                bg-brand-500
                                text-white
                                p-3
                                rounded-full
                                z-50
                            "
                            >
                            🛒
                        </button>

                    </div> */} 

                </Link>

                
            )
        })}

                
       
       </div>

    </div>

  </div>

</div>
);
}

