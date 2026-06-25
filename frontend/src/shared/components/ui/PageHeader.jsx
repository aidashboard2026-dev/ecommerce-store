import React from 'react'
import clsx from 'clsx'

export default function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}) {
  return (
    <div
      className={clsx(
        'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-app',
        className
      )}
      {...props}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-app leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted text-xs mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
