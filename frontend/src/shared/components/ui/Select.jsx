import React from 'react'
import clsx from 'clsx'

export default function Select({
  label,
  error,
  options = [],
  className,
  id,
  children,
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
        <select
          id={id}
          className={clsx(
            'input-field pr-8 appearance-none bg-no-repeat bg-[right_10px_center]',
            error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
            backgroundSize: '14px',
          }}
          {...props}
        >
          {children ||
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
      </div>
      {error && <p className="text-[10px] font-semibold text-red-500">{error}</p>}
    </div>
  )
}
