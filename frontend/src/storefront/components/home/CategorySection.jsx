import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useDestinationResolver } from "@/storefront/routing/DestinationResolver";
import { storefrontAPI } from "@/shared/services/api";
import { Section, ResponsiveGrid } from "@/shared/components/layout";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "").replace(
  /\/$/,
  "",
);

function getImageUrl(path) {
  if (!path) return "";
  if (
    path.startsWith("blob:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  if (path.startsWith("/")) return `${BACKEND_ORIGIN}${path}`;
  return `${BACKEND_ORIGIN}/uploads/categories/${path}`;
}

export default function CategorySection() {
  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["homepage-categories", "public"],
    queryFn: () =>
      storefrontAPI.getHomepageCategories().then((res) => res.data),
    staleTime: 60_000,
    retry: 1,
  });

  const { resolve } = useDestinationResolver();

  if (isError || (!isLoading && categories.length === 0)) return null;

  return (
    <Section spacing="md" className="bg-green-400">
      <h2 className="mb-6 font-display  text-xl font-bold text-app sm:text-2xl lg:text-3xl">
        Shop by Category
      </h2>
      <ResponsiveGrid variant="cards" className="sm:grid-cols-2 lg:grid-cols-4 ">
        {isLoading &&
          [1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="aspect-[4/5] rounded-md bg-surface animate-pulse"
            />
          ))}

        {!isLoading &&
          categories.map((cat) => (
            <Link
              key={cat.id}
              to={
                cat.click_path ||
                resolve(cat.destination_type, cat.destination_id, cat.path)
              }
              className="group relative overflow-hidden rounded-md bg-white shadow-md transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl focus-ring"
            >
              <img
                src={getImageUrl(cat.image)}
                alt={cat.name}
                className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white text-lg md:text-xl font-bold tracking-wide">
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
      </ResponsiveGrid>
    </Section>
  );
}
