import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getImageUrl } from "@/shared/utils/productUtils";

import DefaultHeroImage from "../assets/benners/benner1.jpg";
import DefaultHeroImage2 from "../assets/benners/benner2.jpg";

const AUTO_ROTATE_MS = 6000;
const DEFAULT_BANNERS = [
  {
    id: 1,
    banner_image: DefaultHeroImage,
    title: "Premium Apparel",
    subtitle: "Crafted for Every Moment",
    cta_text: "Shop Now",
    cta_link: "/products",
    local: true,
  },
  {
    id: 2,
    banner_image: DefaultHeroImage2,
    title: "New Season Collection",
    subtitle: "Discover the latest arrivals.",
    cta_text: "Explore",
    cta_link: "/products?collection=New Arrivals",
    local: true,
  },
];

// ─── CTA button — works for internal routes and external links alike ────────
function HeroCta({ banner }) {
  if (!banner.cta_text) return null;

  const className =
    "inline-flex items-center gap-2 bg-white text-black font-semibold text-sm px-4 py-2 md:px-6 md:py-3 rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg";

  if (!banner.cta_link) {
    return <span className={className}>{banner.cta_text}</span>;
  }

  if (
    banner.cta_link.startsWith("http://") ||
    banner.cta_link.startsWith("https://")
  ) {
    return (
      <a
        href={banner.cta_link}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {banner.cta_text} <ArrowRight size={16} />
      </a>
    );
  }

  return (
    <Link to={banner.cta_link} className={className}>
      {banner.cta_text} <ArrowRight size={16} />
    </Link>
  );
}

// ─── A single banner-driven hero slide ───────────────────────────────────────
function BannerSlide({ banner }) {
  if (!banner) return null;

  const imageUrl = banner.local
    ? banner.banner_image
    : getImageUrl(banner.banner_image);

  return (
    <section className="relative  overflow-hidden rounded-3xl h-[300px] sm:h-[350px] md:h-[400px] lg:h-[500px] md:mx-8 md:mt-0 text-white">
      {" "}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={banner.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}
      {/* Legibility overlay over the banner image */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      <div className="relative mx-auto h-full w-full max-w-[1400px] px-2 md:px-4 lg:px-8 py-12 md:py-28 lg:py-36 flex flex-col items-start justify-center gap-2 md:gap-6">
        <span className="inline-flex w-fit items-center gap-2 bg-white/15 backdrop-blur-sm text-[10px] p-1 px-2  font-semibold uppercase tracking-wider md:text-xs md:px-4 md:py-1.5 rounded-full">
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
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function HeroSection({ banners = [] }) {
  const slides = useMemo(() => {
    const adminBanners = banners.filter(
      (b) => b && (b.banner_image || b.title),
    );

    return adminBanners.length ? adminBanners : DEFAULT_BANNERS;
  }, [banners]);

  const [active, setActive] = useState(0);

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

  const nextSlide = () =>
  setActive((i) => (i + 1) % slides.length);

  const prevSlide = () =>
  setActive((i) => (i - 1 + slides.length) % slides.length);


  return (
    <div className="relative">
      <BannerSlide key={active} banner={slides[active]} />

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous banner"
            className="absolute left-3 md:left-10 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next banner"
            className="absolute right-3 md:right-10 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
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
