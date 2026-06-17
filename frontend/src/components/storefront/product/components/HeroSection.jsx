import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white border-b border-gray-200">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
          <Sparkles size={14} /> New Season Collection
        </span>

        <h1 className="font-display uppercase tracking-[0.15em] font-light text-5xl lg:text-7xl text-black max-w-4xl">
          Premium Apparel,<br /> Crafted for Every Moment
        </h1>

        <p className="text-gray-600 text-base max-w-xl leading-relaxed">
          Discover hand-finished streetwear, performance activewear, and timeless essentials —
          designed to move with you.
        </p>

        <div className="flex flex-wrap gap-3 mt-2">
          <Link
            to="/products"
            className="
            inline-flex
            items-center
            gap-2
            bg-black
            text-white
            font-medium
            uppercase
            tracking-widest
            text-xs
            px-8
            py-4
            hover:bg-neutral-800
            transition
            "
          >
            Shop Now <ArrowRight size={16} />
          </Link>
          <Link
            to="/products?collection=New Arrivals"
            className="
            inline-flex
            items-center
            gap-2
            border
            border-black
            text-black
            font-medium
            uppercase
            tracking-widest
            text-xs
            px-8
            py-4
            hover:bg-black
            hover:text-white
            transition
            "
          >
            New Arrivals
          </Link>
        </div>
      </div>
    </section>
  )
}
