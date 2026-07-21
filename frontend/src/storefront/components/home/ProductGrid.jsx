import React from "react";
import ProductCard from "@/storefront/components/product/ProductCard";
import { ResponsiveGrid } from "@/shared/components/layout";

function ProductSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-app animate-pulse">
      <div className="aspect-[4/5] bg-surface" />
      <div className="p-3.5 flex flex-col gap-2">
        <div className="h-2.5 w-1/3 bg-surface rounded" />
        <div className="h-3.5 w-full bg-surface rounded" />
        <div className="h-3.5 w-2/3 bg-surface rounded" />
        <div className="h-4 w-1/2 bg-surface rounded mt-1" />
      </div>
    </div>
  );
}

export default function ProductGrid({
  products,
  loading,
  skeletonCount = 8,
  emptyMessage = "No products found.",
  limit,
}) {
  if (loading && (!products || products.length === 0)) {
    return (
      <ResponsiveGrid variant="products">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </ResponsiveGrid>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const itemsToShow = limit ? products.slice(0, limit) : products;

  return (
    <div className="w-full">
      <ResponsiveGrid variant="products">
        {itemsToShow.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {/* {Array.from({
          length: Math.max(0, 8 - Math.min(products.length, 8)),
        }).map((_, i) => (
          <ProductSkeleton key={`empty-${i}`} />
        ))} */}
      </ResponsiveGrid>
    </div>
  );
}
