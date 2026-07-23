import React from "react";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import clsx from "clsx";
import { getImageUrl } from "@/shared/utils/productUtils";

export default function OfferCard({ offer, className }) {
  return (
    <Link
      to="/products"
      className={clsx(
        "relative flex-none overflow-hidden rounded-2xl border border-app text-white",
        className,
      )}
    >
      {offer.banner_image && (
        <>
          <img
            src={getImageUrl(offer.banner_image)}
            alt={offer.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/30" />
        </>
      )}

      <div
        className={clsx(
          "absolute inset-0 z-10 flex p-6 sm:p-8",
          offer.text_align === "left" && "justify-start",
          offer.text_align === "center" && "justify-center",
          offer.text_align === "right" && "justify-end",
        )}
      >
        <div
          className={clsx(
            "flex h-full max-w-[320px] flex-col justify-between",
            offer.text_align === "left" && "text-left items-start",
            offer.text_align === "center" && "text-center items-center",
            offer.text_align === "right" && "text-right items-end",
          )}
        >
          <span className="inline-flex items-center gap-1 w-fit rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.2em] backdrop-blur-md">
            <Tag size={9} className="text-yellow-300" />
            Limited Offer
          </span>
          <div>
            {offer.title && (
              <h2 className="mt-4 text-2xl font-extrabold leading-tight">
                {offer.title}
              </h2>
            )}
            {offer.description && (
              <p className="mt-3 max-w-md text-xs text-white/90">
                {offer.description}
              </p>
            )}
          </div>

          {offer.percentage && (
            <div className="flex items-end gap-1">
              <span className="text-6xl font-black">{offer.percentage}%</span>
              <div className="pb-1">
                <p className="text-xl font-bold uppercase">OFF</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}