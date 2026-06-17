import React from 'react'
import clsx from 'clsx'

export default function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your filters or search query.',
  icon: Icon,
  action,
  className
}) {
  return (
    <div
      className={clsx(
        'card border-dashed p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4 shadow-none bg-surface/50',
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-app border border-app flex items-center justify-center text-muted shadow-sm animate-pulse-slow">
          <Icon size={20} />
        </div>
      )}
      <div>
        <h3 className="font-display font-bold text-app text-sm leading-tight">{title}</h3>
        {description && (
          <p className="text-muted text-xs mt-1 leading-relaxed max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
