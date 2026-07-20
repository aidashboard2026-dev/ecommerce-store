import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import CustomProductDetailsPage from "@/storefront/components/Customproduct/CustomProductDetailsPage";
import { useCustomProducts } from "@/storefront/hooks/useProducts";
import CustomProductCard from "@/storefront/components/Customproduct/custom_product_card";

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

  const { data } = useCustomProducts()

  const products = data?.items || []
  return (
    <div className="mx-auto w-full  px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="text-center mb-10">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-app">Custom Products</h1>
        <p className="text-sm text-muted mt-2 max-w-xl mx-auto">
          Tell us what you'd like custom-made — pick a category below, choose your options, and
          request a quote. We'll get back to you with pricing and timelines.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <CustomProductCard
            key={product.id}
            product={product}
          />
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
  const { data } = useCustomProducts()

  if (!productType) {
    return <ProductTypeGrid />
  }

  // const config = PRODUCT_TYPES.find((t) => t.key === productType)

  const product =
      data?.items?.find(
          (p) => String(p.id) === productType || String(p.slug) === productType
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
    <div className="mx-auto w-full  px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link
        to="/custom"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-app mb-6"
      >
        <ArrowLeft size={16} />
        Back to Custom Orders
      </Link>

      <CustomProductDetailsPage
        product={product}
      />
    </div>
  );

  
}
