import React from "react";
import CustomProductCard from "./custom_product_card";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
export default function CustomProductSection({ products = [] }) {
  if (!products.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">

      <div className="flex items-end justify-between mb-6">

        <div>

            <h2 className="font-display font-bold text-xl sm:text-2xl text-app">
            Custom Products
            </h2>

            <p className="text-sm text-muted mt-1">
            Personalized products made just for you
            </p>

        </div>

        <Link
            to="/custom"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors"
        >
            View All
            <ArrowRight size={14} />
        </Link>

        </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {products.map((product) => (

          <CustomProductCard
            key={product.id}
            product={product}
          />

        ))}

      </div>

    </section>
  );
}