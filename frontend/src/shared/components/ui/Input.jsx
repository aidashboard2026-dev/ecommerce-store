import React from 'react'
import clsx from 'clsx'

export default function Input({
  label,
  error,
  helperText,
  icon: Icon,
  rightSlot,
  className,
  id,
  disabled = false,
  ...props
}) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-app">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <Icon size={14} />
          </span>
        )}
        <input
          id={id}
          disabled={disabled}
          className={clsx(
            'input-field',
            Icon && 'pl-9.5',
            rightSlot && 'pr-10',
            error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {rightSlot}
          </div>
        )}
      </div>
      {error && <p className="text-[10px] font-semibold text-red-500">{error}</p>}
      {!error && helperText && <p className="text-[10px] text-muted">{helperText}</p>}
    </div>
  )
}
