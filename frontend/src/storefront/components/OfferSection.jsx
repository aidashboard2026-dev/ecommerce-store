import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import OfferCard from "@/storefront/components/OfferCard";

export default function OfferSection({ offers, scrollRef, handleWheel }) {
  if (!offers?.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="font-display text-xl font-bold text-app sm:text-2xl">
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
        className="flex gap-5 overflow-x-auto overflow-y-hidden scrollbar-hide"
      >
        {offers.slice(0, 9).map((offer) => (
          <OfferCard key={offer.id} offer={offer} className="w-[450px] h-[250px]" />
        ))}
      </div>
    </section>
  );
}