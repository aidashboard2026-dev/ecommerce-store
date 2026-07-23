import { useCallback } from "react";
import { useCategories, useCollections } from "@/storefront/hooks/useProducts";

/**
 * Pure function to resolve a destination pair to a storefront URL.
 * Falls back to legacyUrl, and finally to the homepage (/).
 * 
 * Priority order:
 * 1. destination_type + destination_id
 * 2. Legacy path / URL
 * 3. Homepage (/)
 */
export function resolveDestination(type, id, legacyUrl, categories = [], collections = []) {
  if (type) {
    const dstUpper = type.toUpperCase();
    if (dstUpper === "HOME") {
      return "/";
    }
    
    if (dstUpper === "CATEGORY" && id) {
      const categoryId = Number(id);
      if (!isNaN(categoryId)) {
        const category = categories.find((cat) => cat.id === categoryId);
        // Ensure category is found and active
        if (category && (category.status === "active" || category.status === undefined)) {
          return `/products?category=${category.slug}`;
        }
      }
    }

    if (dstUpper === "COLLECTION" && id) {
      const collectionId = Number(id);
      if (!isNaN(collectionId)) {
        const collection = collections.find((col) => col.id === collectionId);
        // Ensure collection is found and active
        if (collection && (collection.status === "active" || collection.status === undefined)) {
          return `/products?collection=${collection.slug}`;
        }
      }
    }

    if (dstUpper === "PRODUCT") {
      // For products, fallback to legacyUrl (which stores the correct /products/{slug} path)
      if (legacyUrl && typeof legacyUrl === "string" && legacyUrl.trim()) {
        return legacyUrl.trim();
      }
    }
  }

  // Fallback to legacy URL
  if (legacyUrl && typeof legacyUrl === "string" && legacyUrl.trim()) {
    return legacyUrl.trim();
  }

  // Final fallback to homepage
  return "/";
}

/**
 * React hook to resolve destinations reactively using cached category and collection data.
 */
export function useDestinationResolver() {
  const { data: categories = [] } = useCategories();
  const { data: collections = [] } = useCollections();

  // Memoize the resolver function using useCallback, ensuring stable reference
  const resolve = useCallback((type, id, legacyUrl) => {
    return resolveDestination(type, id, legacyUrl, categories, collections);
  }, [categories, collections]);

  return { resolve, categories, collections };
}
