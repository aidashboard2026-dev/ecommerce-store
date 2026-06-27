import React from 'react'
import clsx from 'clsx'

export default function LoadingState({
  type = 'table',
  rows = 5,
  cols = 6,
  className
}) {
  if (type === 'card') {
    return (
      <div className={clsx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="card p-5 space-y-4 animate-pulse">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2.5">
                <div className="h-3.5 bg-app border border-app/50 rounded w-1/3" />
                <div className="h-7 bg-app border border-app/50 rounded w-1/2" />
              </div>
              <div className="w-8.5 h-8.5 rounded-lg bg-app border border-app/50" />
            </div>
            <div className="h-3.5 bg-app border border-app/50 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  // default table skeleton loader
  return (
    <div className={clsx('card overflow-hidden animate-pulse', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-app bg-app/20">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3.5 bg-app border border-app/50 rounded w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app/30">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: cols }).map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div
                      className={clsx(
                        'h-3.5 bg-app border border-app/50 rounded',
                        j === 0 ? 'w-24' : 'w-12'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
