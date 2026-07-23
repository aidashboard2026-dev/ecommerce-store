import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  className,
  isLoading = false,
  preventClose = false,
}) {
  const panelRef = useRef(null)
  const isLocked = isLoading || preventClose;

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

  // Focus trap / Close on Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLocked && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isLocked])

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
    <div className="fixed inset-0 z-50 flex justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300 animate-fade-in"
        onClick={() => {
          if (!isLocked && onClose) onClose();
        }}
      />

      {/* Drawer Container */}
      <div
        ref={panelRef}
        className={clsx(
          'relative w-full  h-full bg-app border rounded-lg border-app shadow-elevated flex flex-col z-10 animate-slide-in',
          sizes[size],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-app">
          <div>
            <h2 className="text-sm font-bold text-app uppercase tracking-wider">{title}</h2>
            {subtitle && (
              <p className="text-[10px] text-muted font-medium mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isLocked}
            aria-label="Close panel"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-app text-muted hover:text-app hover:bg-app transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

