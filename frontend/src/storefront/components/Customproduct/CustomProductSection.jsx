import React from "react";
import CustomProductCard from "./custom_product_card";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Section, ResponsiveGrid } from "@/shared/components/layout";
export default function CustomProductSection({ products = [] }) {
  if (!products.length) return null;

  return (
    <Section spacing="md">

      <div className="mb-6 flex items-end justify-between gap-4">

        <div>

            <h2 className="font-display text-xl font-bold text-app sm:text-2xl lg:text-3xl">
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

      <ResponsiveGrid variant="products">

        {products.map((product) => (

          <CustomProductCard
            key={product.id}
            product={product}
          />

        ))}

      </ResponsiveGrid>

    </Section>
  );
}
