import React from 'react'
import { Link } from 'react-router-dom'

const CATEGORIES = [
  { name: 'Streetwear', collection: 'Streetwear', emoji: '🧥' },
  { name: 'Activewear', collection: 'Activewear', emoji: '🏃' },
  { name: 'Essentials', collection: 'Essentials', emoji: '👕' },
  { name: 'Accessories', collection: 'Accessories', emoji: '🧢' },
]

export default function CategorySection() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="font-display font-bold text-xl sm:text-2xl text-app mb-6">Shop by Category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.name}
            to={`/products?sub_collection=${encodeURIComponent(cat.collection)}`}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-app bg-surface p-6 sm:p-8 hover:border-brand-500 hover:shadow-card dark:hover:shadow-card-dark transition-all duration-300"
          >
            <span className="text-3xl sm:text-4xl transition-transform duration-300 group-hover:scale-110">
              {cat.emoji}
            </span>
            <span className="text-sm font-semibold text-app">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
