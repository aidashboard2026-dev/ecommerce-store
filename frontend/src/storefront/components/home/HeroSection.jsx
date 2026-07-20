import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getImageUrl } from "@/shared/utils/productUtils";

import { useDestinationResolver } from "@/storefront/routing/DestinationResolver";
import { Section, ContentWrapper } from "@/shared/components/layout";

const AUTO_ROTATE_MS = 6000;

// ─── CTA button — works for internal routes and external links alike ────────
function HeroCta({ banner }) {
  const { resolve } = useDestinationResolver();
  if (!banner.cta_text) return null;

  const className =
    "inline-flex items-center gap-2 bg-white text-brand-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg";

  const resolvedLink = resolve(
    banner.destination_type,
    banner.destination_id,
    banner.cta_link,
  );

  if (!resolvedLink) {
    return <span className={className}>{banner.cta_text}</span>;
  }

  if (
    resolvedLink.startsWith("http://") ||
    resolvedLink.startsWith("https://")
  ) {
    return (
      <a
        href={resolvedLink}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {banner.cta_text} <ArrowRight size={16} />
      </a>
    );
  }

  return (
    <Link to={resolvedLink} className={className}>
      {banner.cta_text} <ArrowRight size={16} />
    </Link>
  );
}

// ─── A single banner-driven hero slide ───────────────────────────────────────
function BannerSlide({ banner }) {
  if (!banner) return null;

  const imageUrl = getImageUrl(banner.banner_image);
  return (
    <Section spacing="md" className="bg-green-400">
      <ContentWrapper>
      <section className="relative min-h-[320px] w-full overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 text-white sm:min-h-[420px] lg:min-h-[540px]">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={banner.title || "Promotional banner"}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        )}
        {/* Legibility overlay over the banner image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

        <div className="relative flex min-h-[320px] flex-col items-start justify-center gap-5 py-14 sm:min-h-[420px] sm:py-20 lg:min-h-[540px] lg:py-28">
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
            <Sparkles size={14} /> Featured
          </span>

          {banner.title && (
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
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
      </ContentWrapper>
    </Section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function HeroSection({ banners = [] }) {
  const slides = useMemo(() => {
    return (banners ?? [])
      .filter(Boolean)
      .filter((b) => b.banner_image || b.title)
      .slice(0, 5);
  }, [banners]);

  const [active, setActive] = useState(0);

  // Reset to the first slide whenever the banner set changes
  useEffect(() => {
    setActive(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
    // return <StaticHero />;
  }

  return (
    <div className="relative">
      <BannerSlide banner={slides[active]} />

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setActive((i) => (i - 1 + slides.length) % slides.length)
            }
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
                  i === active ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
