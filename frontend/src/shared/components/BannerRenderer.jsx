import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { getImageUrl } from "@/shared/utils/productUtils";

function DefaultCta({ text }) {
  if (!text) return null;
  return (
    <div className="inline-flex items-center gap-2 bg-white text-brand-600 font-semibold text-sm px-6 py-3 rounded-full shadow-lg">
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
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 text-white min-h-[200px] aspect-[4/3] sm:aspect-[16/7] lg:aspect-[16/5.5] xl:aspect-[16/5] 2xl:aspect-[7/2]">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={banner.title || "Promotional banner"}
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

      <div className="relative h-full flex flex-col items-start justify-center gap-5 px-5 sm:px-8 lg:px-10 py-8 sm:py-12 lg:py-20">
        {showFeatured && (
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
            <Sparkles size={14} /> Featured
          </span>
        )}

        {banner.title && (
          <h1 className="max-w-2xl lg:max-w-3xl font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
            {banner.title}
          </h1>
        )}

        {banner.subtitle && (
          <p className="text-sm sm:text-base text-white/85 max-w-sm lg:max-w-md leading-relaxed">
            {banner.subtitle}
          </p>
        )}

        {children}
        {!children && banner.cta_text && <DefaultCta text={banner.cta_text} />}
      </div>
    </div>
  );
}
