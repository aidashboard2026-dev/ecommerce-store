import React from "react";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import clsx from "clsx";
import { getImageUrl } from "@/shared/utils/productUtils";

export default function OfferSection({ offers, scrollRef, handleWheel }) {
  if (!offers?.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
      <h2 className="mb-6 font-display text-xl font-bold text-app sm:text-2xl">
        Limited Time Offers
      </h2>

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-5 overflow-x-auto overflow-y-hidden scrollbar-hide"
      >
        {offers.slice(0, 9).map((offer) => {
          console.log(offer.item_align);
          console.log(offer);

          return (
            <Link
              key={offer.id}
              to="/products"
              className="relative flex-none w-[450px] h-[250px] overflow-hidden rounded-2xl border border-app text-white"
            >
              {offer.banner_image && (
                <>
                  <img
                    src={getImageUrl(offer.banner_image)}
                    alt={offer.title}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />

                  <div className="absolute inset-0" />
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
                      <span className="text-6xl font-black">
                        {offer.percentage}%
                      </span>

                      <div className="pb-1">
                        <p className="text-xl font-bold uppercase">OFF</p>
                        {/* <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Limited Deal
                    </p> */}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
