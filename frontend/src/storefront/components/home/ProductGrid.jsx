import React from "react";
import ProductCard from "@/storefront/components/product/ProductCard";

function ProductSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-app overflow-hidden animate-pulse">
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
}) {
  if (loading && (!products || products.length === 0)) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="">
      <div
        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-items-center"
      >
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {/* {Array.from({
          length: Math.max(0, 8 - Math.min(products.length, 8)),
        }).map((_, i) => (
          <ProductSkeleton key={`empty-${i}`} />
        ))} */}
      </div>
    </div>
  );
}
