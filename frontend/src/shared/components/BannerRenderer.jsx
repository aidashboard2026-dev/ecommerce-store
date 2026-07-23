import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { getImageUrl } from "@/shared/utils/productUtils";

const BANNER_ASPECT_RATIO = "21 / 9";

function DefaultCta({ text }) {
  if (!text) return null;
  return (
    <div
      className="
        inline-flex items-center gap-2 min-h-[44px]
        bg-white text-brand-600 font-semibold
        text-[clamp(0.8125rem,1.5vw+0.4rem,0.9375rem)]
        px-[clamp(1.125rem,3vw,1.5rem)] py-[clamp(0.625rem,1.5vw,0.75rem)]
        rounded-full shadow-lg
        flex-shrink-0
      "
    >
      {text} <ArrowRight size={16} />
    </div>
  );
}

export default function BannerRenderer({
  banner,
  showFeatured = true,
  imageUrl: overrideUrl,
  children,
}) {
  if (!banner) return null;

  const imageUrl = overrideUrl || getImageUrl(banner.banner_image);

  return (
    <div
      className="relative w-full overflow-hidden text-white max-h-[70vh] lg:max-h-[640px]"
      style={{ aspectRatio: BANNER_ASPECT_RATIO }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={banner.title || "Promotional banner"}
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
      )}

      <div className="absolute inset-0" />

      <div
        className="
          relative h-full flex flex-col items-start
          justify-end sm:justify-center
          gap-[clamp(0.5rem,2.2vw,1.25rem)]
          px-[clamp(1.25rem,5vw,3rem)]
          py-[clamp(1rem,5vw,2.5rem)]
        "
      >
        {showFeatured && (
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
            <Sparkles size={14} /> Featured
          </span>
        )}

        {banner.title && (
          <h1 className="max-w-2xl lg:max-w-3xl font-display font-bold leading-tight text-[clamp(1.25rem,3.5vw+0.4rem,3rem)]">
            {banner.title}
          </h1>
        )}

        {banner.subtitle && (
          <p className="text-white/85 max-w-sm lg:max-w-md leading-relaxed text-[clamp(0.8125rem,1.2vw+0.45rem,1.0625rem)]">
            {banner.subtitle}
          </p>
        )}

        <div className="mt-[clamp(0.125rem,1vw,0.5rem)]">
          {children}
          {!children && banner.cta_text && (
            <DefaultCta text={banner.cta_text} />
          )}
        </div>
      </div>
    </div>
  );
}
