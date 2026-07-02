import React from 'react'

export default function CartBadge({ count = 0 }) {
  if (count <= 0) return null

  return (
    <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-[9px] font-bold h-4 min-w-[1rem] px-1 rounded-full flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}
