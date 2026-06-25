import React from 'react'
import clsx from 'clsx'

const variants = {
  new: 'bg-sky-500/5 text-sky-600 border border-sky-500/10 dark:bg-sky-500/10 dark:text-sky-400',
  success: 'bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-500/5 text-amber-600 border border-amber-500/10 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-500/5 text-red-600 border border-red-500/10 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-indigo-500/5 text-indigo-600 border border-indigo-500/10 dark:bg-indigo-500/10 dark:text-indigo-400',
  default: 'bg-zinc-500/5 text-zinc-600 border border-zinc-500/10 dark:bg-zinc-500/10 dark:text-zinc-400',
}

export default function Badge({ label, variant = 'default', dot = false, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full animate-pulse-slow', {
            'bg-sky-500': variant === 'new',
            'bg-emerald-500': variant === 'success',
            'bg-amber-500': variant === 'warning',
            'bg-red-500': variant === 'danger',
            'bg-indigo-600': variant === 'info',
            'bg-zinc-400': variant === 'default',
          })}
        />
      )}
      <span>{label}</span>
    </span>
  )
}
