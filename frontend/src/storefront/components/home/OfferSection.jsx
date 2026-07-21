import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import OfferCard from "@/storefront/components/home/OfferCard";
import { Section } from "@/shared/components/layout";

export default function OfferSection({ offers, scrollRef, handleWheel }) {
  if (!offers?.length) return null;

  return (
    <Section spacing="md">
      <div className="p-3 flex items-end justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-app sm:text-2xl lg:text-3xl">
          Limited Time Offers
        </h2>
        {offers.length > 9 && (
          <Link
            to="/offers"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600"
          >
            View All <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="-mx-4 flex snap-x gap-4 overflow-x-auto overflow-y-hidden px-4 scrollbar-hide sm:-mx-6 sm:px-6 lg:-mx-8 lg:gap-5 lg:px-8"
      >
        {offers.slice(0, 9).map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            className="aspect-[16/9] min-w-[min(82vw,22rem)] snap-start sm:min-w-[24rem] lg:min-w-[28rem]"
          />
        ))}
      </div>
    </Section>
  );
}
