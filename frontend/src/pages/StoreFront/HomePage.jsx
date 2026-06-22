import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import HeroSection from '../../components/storefront/HeroSection'
import CategorySection from '../../components/storefront/CategorySection'
import OfferBanner from '../../components/storefront/OfferBanner'
import ProductGrid from '../../components/storefront/ProductGrid'
import {
  useFeaturedProducts,
  useNewArrivals,
  useBestSellers,
  useActiveOffers,
  useActiveBanners,
} from '../../hooks/useProducts'

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-app">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      <Link
        to="/products"
        className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600"
      >
        View All <ArrowRight size={14} />
      </Link>
    </div>
  )
}

export default function HomePage() {
  const { data: featured = [], isLoading: loadingFeatured } = useFeaturedProducts()
  const { data: newArrivals = [], isLoading: loadingNew } = useNewArrivals()
  const { data: bestSellers = [], isLoading: loadingBest } = useBestSellers()
  const { data: offers = [] } = useActiveOffers()
  const { data: banners = [] } = useActiveBanners()

  // Only the "hero" placement belongs in the hero slider — other placements
  // (homepage_mid, category, sidebar, popup) are reserved for future sections.
  const heroBanners = banners
    .filter((b) => b.placement === 'hero')
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col">
      <HeroSection banners={heroBanners} />

      <CategorySection />

      {/* Offers */}
      {offers.length > 0 && (
        <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {offers.slice(0, 2).map((offer) => (
              <OfferBanner key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {(loadingFeatured || featured.length > 0) && (
        <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
          <SectionHeader title="Featured Products" subtitle="Hand-picked styles, just for you" />
          <ProductGrid products={featured} loading={loadingFeatured} skeletonCount={4} />
        </section>
      )}

      {/* New Arrivals */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
        <SectionHeader title="New Arrivals" subtitle="Fresh off the production line" />
        <ProductGrid products={newArrivals} loading={loadingNew} skeletonCount={4} />
      </section>

      {/* Best Sellers */}
      {(loadingBest || bestSellers.length > 0) && (
        <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
          <SectionHeader title="Best Sellers" subtitle="Customer favorites, in high demand" />
          <ProductGrid products={bestSellers} loading={loadingBest} skeletonCount={4} />
        </section>
      )}
    </div>
  )
}
