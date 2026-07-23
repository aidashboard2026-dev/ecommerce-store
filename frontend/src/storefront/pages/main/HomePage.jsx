import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import HeroSection from "@/storefront/components/home/HeroSection";
import CategorySection from "@/storefront/components/home/CategorySection";
import OfferSection from "@/storefront/components/home/OfferSection";
import ProductGrid from "@/storefront/components/home/ProductGrid";
import CustomProductSection from "@/storefront/components/Customproduct/CustomProductSection";
import { Section } from "@/shared/components/layout";

import {
  useFeaturedProducts,
  useNewArrivals,
  useBestSellers,
  useActiveOffers,
  useActiveBanners,
  useCustomProducts,
} from "@/storefront/hooks/useProducts";

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold text-app sm:text-2xl lg:text-3xl">
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
  const { data: customData } = useCustomProducts();

  const customProducts = customData?.items ?? customData ?? [];

  const handleWheel = (e) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Only the "hero" placement belongs in the hero slider — other placements
  // (homepage_mid, category, sidebar, popup) are reserved for future sections.
  const heroBanners = banners
    .filter((b) => b.placement === "hero")
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="w-full">
      <HeroSection banners={heroBanners} />

      <CategorySection />

      <OfferSection
        offers={offers}
        scrollRef={scrollRef}
        handleWheel={handleWheel}
      />

      <CustomProductSection  products={customProducts} />

      {(loadingFeatured || featured.length > 0) && (
        <Section spacing="md" className="p-3">
          <SectionHeader
            title="Featured Products"
            subtitle="Hand-picked styles, just for you"
          />
          <ProductGrid
            products={featured}
            loading={loadingFeatured}
            skeletonCount={4}
            limit={8}
          />
        </Section>
      )}

      <Section spacing="md" className="p-3">
        <SectionHeader
          title="New Arrivals"
          subtitle="Fresh off the production line"
        />
        <ProductGrid
          products={newArrivals}
          loading={loadingNew}
          skeletonCount={4}
          limit={8}
        />
      </Section>

      {(loadingBest || bestSellers.length > 0) && (
        <Section spacing="md" className="p-3">
          <SectionHeader
            title="Best Sellers"
            subtitle="Customer favorites, in high demand"
          />
          <ProductGrid
            products={bestSellers}
            loading={loadingBest}
            skeletonCount={4}
            limit={8}
          />
        </Section>
      )}
    </main>
  );
}
