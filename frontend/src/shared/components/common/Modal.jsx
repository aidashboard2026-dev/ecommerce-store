import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={clsx(
        'relative w-full bg-app border border-app rounded-2xl shadow-2xl animate-slide-up flex flex-col overflow-hidden',
        sizes[size]
      )} style={{ maxHeight: 'calc(100vh - 3rem)' }}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-app flex-shrink-0">
          <h2 className="text-base sm:text-lg font-display font-bold text-app truncate">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-app hover:bg-surface transition-all"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Close on Escape for accessibility
Modal.defaultProps = {}
