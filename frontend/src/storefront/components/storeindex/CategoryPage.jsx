import { useParams } from "react-router-dom";
import { PageContainer, ResponsiveGrid } from "@/shared/components/layout";

export default function CategoryPage() {
  const { slug } = useParams();

  const products = [
    {
      id: 1,
      name: "Premium Round Neck T-Shirt",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
      price: 999,
      originalPrice: 1499,
      description: "100% Cotton Premium Quality Round Neck T-Shirt"
    },
    {
      id: 2,
      name: "Oversized Streetwear Tee",
      image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27",
      price: 1199,
      originalPrice: 1799,
      description: "Modern oversized fit with premium fabric"
    },
    {
      id: 3,
      name: "Graphic Printed T-Shirt",
      image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1",
      price: 899,
      originalPrice: 1299,
      description: "Stylish graphic print for casual wear"
    },
    {
      id: 4,
      name: "Minimal Polo T-Shirt",
      image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820",
      price: 1299,
      originalPrice: 1899,
      description: "Premium polo collection"
    },
    {
      id: 5,
      name: "Sports Performance Tee",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
      price: 799,
      originalPrice: 1199,
      description: "Breathable fabric for workouts"
    },
    {
      id: 6,
      name: "Embroidery Design T-Shirt",
      image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b",
      price: 1499,
      originalPrice: 1999,
      description: "Custom embroidery premium design"
    },
    {
      id: 7,
      name: "Back Print T-Shirt",
      image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f",
      price: 999,
      originalPrice: 1599,
      description: "Trendy back print fashion wear"
    },
    {
      id: 8,
      name: "Korean Style T-Shirt",
      image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c",
      price: 1399,
      originalPrice: 1999,
      description: "Premium Korean street fashion"
    }
  ];

  return (
    <PageContainer>

        {/* Category Title */}
        <h1 className="mb-2 font-display text-2xl font-bold capitalize text-app sm:text-3xl lg:text-4xl">
          {slug?.replaceAll("-", " ")}
        </h1>

        <p className="mb-8 text-sm text-muted">
          Browse all products from this category
        </p>

        {/* Products Grid */}
        <ResponsiveGrid variant="products">

          {products.map((product) => (
            <div
              key={product.id}
              className="
                bg-app
                rounded-md
                border
                border-gray-200
                shadow-sm
                overflow-hidden
                hover:shadow-xl
                hover:-translate-y-1
                transition-all
                duration-300
              "
            >
              {/* Product Image */}
              <img
                src={product.image}
                alt={product.name}
                className="aspect-[4/5] w-full object-cover"
              />

              {/* Product Content */}
              <div className="p-4">

                {/* Product Name */}
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {product.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {product.description}
                </p>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-brand-500">
                    ₹{product.price}
                  </span>

                  <span className="text-sm line-through text-gray-400">
                    ₹{product.originalPrice}
                  </span>

                  <span className="text-green-600 text-xs font-semibold">
                    {Math.round(
                      ((product.originalPrice - product.price) /
                        product.originalPrice) *
                        100
                    )}
                    % OFF
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">

                  <button
                    className="
                      flex-1
                      bg-brand-500
                      text-white
                      py-2
                      rounded-lg
                      hover:bg-brand-600
                      transition
                    "
                  >
                    Add To Cart
                  </button>

                  <button
                    className="
                      px-4
                      border
                      rounded-lg
                      hover:bg-gray-100
                      transition
                    "
                  >
                    ❤️
                  </button>

                </div>

              </div>
            </div>
          ))}

        </div>

        </ResponsiveGrid>
    </PageContainer>
  );
}
  
