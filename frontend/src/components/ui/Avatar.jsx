import React from 'react'
import clsx from 'clsx'
import { User } from 'lucide-react'

export default function Avatar({
  src,
  firstName,
  lastName,
  size = 'md',
  className
}) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()

  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
  }

  // Generate a distinct stable gradient based on the initials
  const hues = [
    'from-indigo-500 to-indigo-700 text-white',
    'from-violet-500 to-violet-700 text-white',
    'from-emerald-500 to-emerald-700 text-white',
    'from-pink-500 to-pink-700 text-white',
    'from-amber-500 to-amber-700 text-white'
  ]
  const index = initials ? (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % hues.length : 0
  const bgClass = src ? '' : hues[index]

  return (
    <div
      className={clsx(
        'relative rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-sm shrink-0 bg-gradient-to-br border border-white/10',
        sizes[size],
        bgClass,
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={firstName ? `${firstName} ${lastName}` : 'User avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <span>{initials || <User size={14} />}</span>
      )}
    </div>
  )
}
