import React from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import HeroSection from "@/storefront/components/HeroSection";
import CategorySection from "@/storefront/components/CategorySection";
import OfferBanner from "@/storefront/components/OfferBanner";
import ProductGrid from "@/storefront/components/ProductGrid";

import {
  useFeaturedProducts,
  useNewArrivals,
  useBestSellers,
  useActiveOffers,
  useActiveBanners,
} from "@/storefront/hooks/useProducts";

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-app">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      <Link
        to="/products"
        className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600"
      >
        View All <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export default function HomePage() {
  const { data: featured = [], isLoading: loadingFeatured } =
    useFeaturedProducts();
  const { data: newArrivals = [], isLoading: loadingNew } = useNewArrivals();
  const { data: bestSellers = [], isLoading: loadingBest } = useBestSellers();
  const { data: offers = [] } = useActiveOffers();
  const { data: banners = [] } = useActiveBanners();

  const scrollRef = useRef(null);

  const handleWheel = (e) => {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Only the "hero" placement belongs in the hero slider — other placements
  // (homepage_mid, category, sidebar, popup) are reserved for future sections.
  const heroBanners = banners
    .filter((b) => b.placement === "hero")
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col">
      <HeroSection banners={heroBanners} />

      <CategorySection />

      {/* Offers */}
      {offers.length > 0 && (
        <section className="mx-auto w-full h-[400px] max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
          <div
            ref={scrollRef}
            onWheel={handleWheel}
            className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide"
          >
            {offers.slice(0, 9).map((offer) => (
              <div key={offer.id} className="flex-none h-[500px] w-[350px]">
                <OfferBanner offer={offer} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {(loadingFeatured || featured.length > 0) && (
        <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
          <SectionHeader
            title="Featured Products"
            subtitle="Hand-picked styles, just for you"
          />
          <ProductGrid
            products={featured}
            loading={loadingFeatured}
            skeletonCount={4}
          />
        </section>
      )}

      {/* New Arrivals */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
        <SectionHeader
          title="New Arrivals"
          subtitle="Fresh off the production line"
        />
        <ProductGrid
          products={newArrivals}
          loading={loadingNew}
          skeletonCount={4}
        />
      </section>

      {/* Best Sellers */}
      {(loadingBest || bestSellers.length > 0) && (
        <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
          <SectionHeader
            title="Best Sellers"
            subtitle="Customer favorites, in high demand"
          />
          <ProductGrid
            products={bestSellers}
            loading={loadingBest}
            skeletonCount={4}
          />
        </section>
      )}
    </div>
  );
}
