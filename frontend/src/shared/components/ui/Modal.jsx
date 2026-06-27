import React, { useEffect } from 'react'
import clsx from 'clsx'

export default function Modal({
  isOpen,
  children,
  size = 'md',
  className,
}) {
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-4 overflow-y-auto">
      

      {/* Modal Frame */}
      <div
  className={clsx(
    `
    relative
    mt-4
    w-full
    flex
    flex-col
    bg-app
    rounded-2xl
    shadow-2xl
    max-h-[90vh]
    overflow-hidden
    `,
          sizes[size],
          className
        )}
      >
        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}