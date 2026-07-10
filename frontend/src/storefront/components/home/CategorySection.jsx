import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useDestinationResolver } from '@/storefront/routing/DestinationResolver'
import { storefrontAPI } from "@/shared/services/api";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/")) return `${BACKEND_ORIGIN}${path}`;
  return `${BACKEND_ORIGIN}/uploads/categories/${path}`;
}

export default function CategorySection() {
  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ["homepage-categories", "public"],
    queryFn: () => storefrontAPI.getHomepageCategories().then((res) => res.data),
    staleTime: 60_000,
    retry: 1,
  });

  const { resolve } = useDestinationResolver();

  if (isError || (!isLoading && categories.length === 0)) return null;

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="font-display font-bold text-xl sm:text-2xl text-app mb-6">
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading &&
          [1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-48 md:h-40 lg:h-80 rounded-2xl bg-surface animate-pulse"
            />
          ))}

        {!isLoading &&
          categories.map((cat) => (
            <Link
              key={cat.id}
              to={resolve(cat.destination_type, cat.destination_id, cat.path)}
              className="group relative overflow-hidden rounded-2xl"
            >
              <img
                src={getImageUrl(cat.image)}
                alt={cat.name}
                className="h-48 md:h-40 lg:h-80 w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent transition duration-300" />

              <div className="absolute inset-0 flex items-end justify-center p-3">
                <h3 className="text-white text-base font-semibold drop-shadow-lg">
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
      </div>
    </section>
  );
}
