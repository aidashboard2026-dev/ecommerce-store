import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import CustomProductForm from "@/storefront/components/CustomProductForm";
import { useCustomProducts } from "@/storefront/hooks/useProducts";

// Index cards shown at /custom. Cup Printing is offered as two distinct
// cards (Magic Cup / White Cup) per the brief's 9-section list, even though
// both route to the same `cup` product type — the desired style is passed
// through as a query param and used to preselect it on the form.
// const INDEX_CARDS = PRODUCT_TYPES.flatMap((type) => {
//   if (type.key === 'cup') {
//     return [
//       { ...type, cardLabel: 'Magic Cup Printing', style: 'Magic Cup' },
//       { ...type, cardLabel: 'White Cup Printing', style: 'White Cup' },
//     ]
//   }
//   return [{ ...type, cardLabel: type.label }]
// })

function ProductTypeGrid() {

  const { data, isLoading } = useCustomProducts()

  const products = data?.items || []
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="text-center mb-10">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-app">Custom Orders</h1>
        <p className="text-sm text-muted mt-2 max-w-xl mx-auto">
          Tell us what you'd like custom-made — pick a category below, choose your options, and
          request a quote. We'll get back to you with pricing and timelines.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/custom/${product.id}`}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-app bg-surface p-6 sm:p-8 text-center hover:border-brand-500 hover:shadow-card dark:hover:shadow-card-dark transition-all duration-300"
          > 
            <p className="text-xs uppercase text-muted">

              {product.category?.name}

            </p>
            <img
                src={product.thumbnail}
                alt={product.title}
                className="w-20 h-20 rounded-xl object-cover"
            />
            <span className="text-sm font-semibold text-app">{product.title}</span>

            <p className="text-xs text-muted line-clamp-2">
                {product.short_description || product.description}
            </p>

            <p className="text-brand-600 font-bold">
              ₹{product.selling_price_min}
              {product.selling_price_max &&
                  ` - ₹${product.selling_price_max}`}
            </p>

            <p className="text-xs line-through text-muted">
              ₹{product.original_price_min}
              {product.original_price_max &&
                  ` - ₹${product.original_price_max}`}
            </p>


          </Link>
          
        ))}
      </div>

      
    </div>
  )
}

// Consolidated custom-orders page. /custom shows the type-selection grid;
// /custom/:productType renders the dynamic form for that type. No new APIs
// are wired here — quote requests and design uploads stay client-side and
// reuse existing UI/upload patterns from elsewhere in the app.
export default function CustomPage() {
  const { productType } = useParams()
  // const [searchParams] = useSearchParams()

  if (!productType) {
    return <ProductTypeGrid />
  }

  // const config = PRODUCT_TYPES.find((t) => t.key === productType)
  const { data, isLoading } = useCustomProducts()

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  const product =
      data?.items?.find(
          (p) => String(p.id) === productType
      )
  if (!product) {
    return (
      <div className="mx-auto w-full max-w-[700px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-app font-semibold mb-4">Unknown custom product type.</p>
        <Link to="/custom" className="text-brand-500 font-semibold text-sm">
          Back to Custom Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link to="/custom" className="inline-flex items-center gap-2 text-sm text-muted hover:text-app mb-6">
        <ArrowLeft size={16} /> Back to Custom Orders
      </Link>
      <CustomProductForm
        product={product}
      />
    </div>
  )
}
