import React from 'react'
import clsx from 'clsx'

const variants = {
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  info: 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400',
  default: 'bg-surface text-muted',
}

export default function Badge({ label, variant = 'default', dot = false }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
      variants[variant]
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', {
        'bg-emerald-500': variant === 'success',
        'bg-amber-500': variant === 'warning',
        'bg-red-500': variant === 'danger',
        'bg-brand-500': variant === 'info',
        'bg-gray-400': variant === 'default',
      })} />}
      {label}
    </span>
  )
}
