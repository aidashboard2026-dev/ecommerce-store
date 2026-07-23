import React from 'react'
import clsx from 'clsx'

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  loadingText,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50'

  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 border border-brand-600 hover:shadow-lg hover:shadow-brand-500/25 hover:scale-[1.02]',
    secondary: 'bg-surface hover:bg-app text-app border border-app shadow-sm shadow-black/[0.01]',
    outline: 'border border-app hover:border-brand-500 text-app hover:text-brand-500',
    ghost: 'hover:bg-app text-muted hover:text-app',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/10 border border-red-600',
    save: 'border border-app shadow-sm shadow-black/[0.01] hover:text-app hover:bg-green-500/90 hover:border hover:border-green-600',
    delete: 'border border-app shadow-sm shadow-black/[0.01] hover:text-app hover:bg-red-500/90 hover:border hover:border-red-600',
    addvariant: 'border border-app shadow-sm shadow-black/[0.01] hover:text-app hover:bg-sky-500/90 hover:border hover:border-sky-600',
    download: 'border border-app shadow-sm shadow-black/[0.01] hover:text-app hover:bg-orange-500/90 hover:border hover:border-orange-600',
  }

  const sizes = {
    sm: 'px-2.5 py-1.5 text-[11px] gap-1.5',
    md: 'px-3.5 py-2 text-xs gap-2',
    lg: 'px-4.5 py-2.5 text-sm gap-2',
  }

  const isDisabled = loading || disabled;

  const handleClick = (e) => {
    if (isDisabled) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={14} className="shrink-0" />}
      <span>{loading && loadingText ? loadingText : children}</span>
      {!loading && Icon && iconPosition === 'right' && <Icon size={14} className="shrink-0" />}
    </button>
  )
}
