import React from 'react'
import clsx from 'clsx'

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={clsx(
        sizes[size],
        'rounded-full border-2 border-brand-500 border-t-transparent animate-spin',
        className
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-muted text-sm">Loading...</p>
      </div>
    </div>
  )
}
