import React from 'react'

export default function CartBadge({ count = 0 }) {
  if (count <= 0) return null

  return (
    <span className=" absolute top-1 right-1 flex bg-[var(--count-bg)] items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-white text-[10px] font-bold leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}
