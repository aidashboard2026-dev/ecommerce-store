import React from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../../../../utils/productUtils'
import { Tag } from 'lucide-react'

export default function OfferBanner({ offer }) {
  if (!offer) return null

  return (
    <Link
      to="/products"
      className="relative flex items-center gap-4 rounded-2xl overflow-hidden border border-app bg-gradient-to-r from-indigo-600 to-brand-500 text-white p-6 sm:p-8 hover:opacity-95 transition-opacity duration-200 min-h-[140px]"
    >
      {offer.banner_image && (
        <img
          src={getImageUrl(offer.banner_image)}
          alt={offer.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <div className="relative z-10 flex flex-col gap-2">
        <span className="inline-flex items-center gap-1.5 bg-white/20 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full w-fit">
          <Tag size={12} /> Limited Time Offer
        </span>
        <h3 className="font-display font-bold text-xl sm:text-2xl">{offer.title}</h3>
        {offer.description && (
          <p className="text-xs sm:text-sm text-white/85 max-w-md">{offer.description}</p>
        )}
        <span className="text-2xl font-bold mt-1">{offer.percentage}% OFF</span>
      </div>
    </Link>
  )
}
