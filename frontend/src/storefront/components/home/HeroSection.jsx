import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { useDestinationResolver } from "@/storefront/routing/DestinationResolver";
import { Section, ContentWrapper } from "@/shared/components/layout";
import BannerRenderer from "@/shared/components/BannerRenderer";

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

  return (
    <Section spacing="md" className="bg-green-400">
      <ContentWrapper>
        <BannerRenderer banner={banner}>
          {banner.cta_text && <HeroCta banner={banner} />}
        </BannerRenderer>
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
