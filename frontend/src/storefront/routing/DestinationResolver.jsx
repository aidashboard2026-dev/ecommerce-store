import { useCallback } from "react";
import { useCategories } from "@/storefront/hooks/useProducts";

/**
 * Pure function to resolve a destination pair to a storefront URL.
 * Falls back to legacyUrl, and finally to the homepage (/).
 * 
 * Priority order:
 * 1. destination_type + destination_id
 * 2. Legacy path / URL
 * 3. Homepage (/)
 */
export function resolveDestination(type, id, legacyUrl, categories = []) {
  if (type) {
    const dstUpper = type.toUpperCase();
    if (dstUpper === "HOME") {
      return "/";
    }
    
    if (dstUpper === "CATEGORY" && id) {
      const categoryId = Number(id);
      if (!isNaN(categoryId)) {
        const category = categories.find((cat) => cat.id === categoryId);
        // Ensure category is found and active (the /products/categories public list only has active ones,
        // but checking cat.status === "active" provides defense in depth)
        if (category && (category.status === "active" || category.status === undefined)) {
          return `/products?category=${category.slug}`;
        }
      }
    }
    // Future extension points:
    // if (dstUpper === "PRODUCT" && id) { ... }
    // if (dstUpper === "COLLECTION" && id) { ... }
  }

  // Fallback to legacy URL
  if (legacyUrl && typeof legacyUrl === "string" && legacyUrl.trim()) {
    return legacyUrl.trim();
  }

  // Final fallback to homepage
  return "/";
}

/**
 * React hook to resolve destinations reactively using cached category data.
 * Leverages the existing React Query cache from useCategories to avoid duplicate fetches.
 */
export function useDestinationResolver() {
  const { data: categories = [] } = useCategories();

  // Memoize the resolver function using useCallback, ensuring stable reference
  const resolve = useCallback((type, id, legacyUrl) => {
    return resolveDestination(type, id, legacyUrl, categories);
  }, [categories]);

  return { resolve, categories };
}
