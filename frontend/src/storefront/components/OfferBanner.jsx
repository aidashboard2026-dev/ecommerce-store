import React from "react";
import { Link } from "react-router-dom";
import { getImageUrl } from "@/shared/utils/productUtils";
import { Tag } from "lucide-react";

export default function OfferBanner({ offer }) {
  if (!offer) return null;

  return (
    <Link
      to="/products"
      className="relative flex items-center gap-4 rounded-2xl overflow-hidden border border-app text-white p-6 sm:p-8 min-h-[140px]"
    >
      {offer.banner_image && (
        <img
          src={getImageUrl(offer.banner_image)}
          alt={offer.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      )}
      <div className="relative z-10 flex flex-col justify-start gap-3 h-full max-w-lg">
        <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-semibold uppercase tracking-[0.2em] px-4 py-2 rounded-full w-fit shadow-lg">
          <Tag size={13} className="text-yellow-300" />
          Limited Time Offer
        </span>

        {offer.title?.trim() && (
          <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
            {offer.title}
          </h2>
        )}

        {offer.description?.trim() && (
          <p className="text-sm sm:text-base text-white/85 leading-7 max-w-md">
            {offer.description}
          </p>
        )}

        {offer.percentage?.trim() && (
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl sm:text-6xl font-black leading-none drop-shadow-lg">
              {offer.percentage}%
            </span>

            <div className="pb-1">
              <p className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-white">
                OFF
              </p>
              <p className="text-xs text-white/70 uppercase tracking-[0.2em]">
                Limited Deal
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
