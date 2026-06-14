import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 text-white">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
          <Sparkles size={14} /> New Season Collection
        </span>

        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight max-w-2xl">
          Premium Apparel,<br /> Crafted for Every Moment
        </h1>

        <p className="text-sm sm:text-base text-white/85 max-w-md leading-relaxed">
          Discover hand-finished streetwear, performance activewear, and timeless essentials —
          designed to move with you.
        </p>

        <div className="flex flex-wrap gap-3 mt-2">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-brand-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg"
          >
            Shop Now <ArrowRight size={16} />
          </Link>
          <Link
            to="/products?collection=New Arrivals"
            className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/10 transition-all duration-200"
          >
            New Arrivals
          </Link>
        </div>
      </div>
    </section>
  )
}
