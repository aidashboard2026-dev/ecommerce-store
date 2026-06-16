import React from 'react'
import clsx from 'clsx'

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/10 border border-brand-600',
    secondary: 'bg-surface hover:bg-app text-app border border-app shadow-sm shadow-black/[0.01]',
    outline: 'border border-app hover:border-brand-500 text-app hover:text-brand-500',
    ghost: 'hover:bg-app text-muted hover:text-app',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/10 border border-red-600',
  }

  const sizes = {
    sm: 'px-2.5 py-1.5 text-[11px] gap-1.5',
    md: 'px-3.5 py-2 text-xs gap-2',
    lg: 'px-4.5 py-2.5 text-sm gap-2',
  }

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={14} className="shrink-0" />}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && <Icon size={14} className="shrink-0" />}
    </button>
  )
}
