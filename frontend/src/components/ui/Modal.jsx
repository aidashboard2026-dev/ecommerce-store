import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={clsx(
          'relative w-full bg-surface border border-app rounded-2xl shadow-elevated animate-slide-up flex flex-col max-h-[90vh] overflow-hidden',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-app">
          <div>
            <h2 className="text-sm font-bold text-app uppercase tracking-wider">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-app text-muted hover:text-app hover:bg-app transition-all active:scale-95"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
