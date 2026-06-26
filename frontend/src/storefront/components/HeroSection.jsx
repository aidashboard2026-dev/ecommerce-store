import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { getImageUrl } from '@/shared/utils/productUtils'

const AUTO_ROTATE_MS = 6000

// ─── CTA button — works for internal routes and external links alike ────────
function HeroCta({ banner }) {
  if (!banner.cta_text) return null

  const className =
    'inline-flex items-center gap-2 bg-black text-brand-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg'

  if (!banner.cta_link) {
    return <span className={className}>{banner.cta_text}</span>
  }

  if (banner.cta_link.startsWith('http://') || banner.cta_link.startsWith('https://')) {
    return (
      <a href={banner.cta_link} target="_blank" rel="noopener noreferrer" className={className}>
        {banner.cta_text} <ArrowRight size={16} />
      </a>
    )
  }

  return (
    <Link to={banner.cta_link} className={className}>
      {banner.cta_text} <ArrowRight size={16} />
    </Link>
  )
}

// ─── A single banner-driven hero slide ───────────────────────────────────────
function BannerSlide({ banner }) {
  const imageUrl = getImageUrl(banner.banner_image)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 text-white">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={banner.title || 'Promotional banner'}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}
      {/* Legibility overlay over the banner image */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
          <Sparkles size={14} /> Featured
        </span>

        {banner.title && (
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight max-w-2xl">
            {banner.title}
          </h1>
        )}

        {banner.subtitle && (
          <p className="text-sm sm:text-base text-white/85 max-w-md leading-relaxed">
            {banner.subtitle}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-2">
          <HeroCta banner={banner} />
        </div>
      </div>
    </section>
  )
}

// ─── Default hero shown when there are no active "hero" placement banners ───
function StaticHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 text-white">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
          <Sparkles size={14} /> New Season Collection
        </span>

        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight max-w-2xl">
          Premium Apparel,<br /> Crafted for Every Moment
        </h1>

        <p className="text-sm sm:text-base text-white/85 max-w-md leading-relaxed">
          Discover hand-finished streetwear, performance activewear, and timeless essentials —
          designed to move with you.
        </p>

        <div className="flex flex-wrap gap-3 mt-2">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-brand-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg"
          >
            Shop Now <ArrowRight size={16} />
          </Link>
          <Link
            to="/products?collection=New Arrivals"
            className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/10 transition-all duration-200"
          >
            New Arrivals
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
// Renders admin-managed "hero" placement banners as an auto-rotating slider.
// Falls back to the static hero below when no active hero banners exist, so
// the storefront never shows an empty section.
export default function HeroSection({ banners = [] }) {
  const slides = useMemo(
    () =>
      banners.filter((b) => b && (b.banner_image || b.title)).slice(0, 5),
    [banners]
  )

  const [active, setActive] = useState(0)

  // Reset to the first slide whenever the banner set changes (e.g. after a
  // background refetch adds/removes a banner) so `active` never points past
  // the end of a shorter array.
  useEffect(() => {
    setActive(0)
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 2) return
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length)
    }, AUTO_ROTATE_MS)
    return () => clearInterval(timer)
  }, [slides.length])

  if (slides.length === 0) {
    return <StaticHero />
  }

  return (
    <div className="relative">
      <BannerSlide banner={slides[active]} />

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setActive((i) => (i + 1) % slides.length)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
