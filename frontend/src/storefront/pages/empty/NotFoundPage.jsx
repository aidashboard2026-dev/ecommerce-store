import React from 'react'
import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="mx-auto w-full  px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center">
        <Compass size={28} className="text-muted" />
      </div>
      <h1 className="font-display font-bold text-xl text-app">Page not found</h1>
      <p className="text-sm text-muted max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-glow-sm transition-colors"
      >
        Back to Home
      </Link>
    </div>
  )
}
