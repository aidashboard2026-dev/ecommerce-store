import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'

export default function StatCard({ title, value, change, icon: Icon, color, prefix = '', suffix = '' }) {
  const isPositive = change >= 0

  return (
    <div className="card p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center',
            color
          )}
        >
          <Icon size={20} className="text-white" />
        </div>
        <span className={clsx(
          'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
          isPositive
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
        )}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}%
        </span>
      </div>

      <p className="text-muted text-sm font-medium">{title}</p>
      <p className="text-2xl font-display font-bold text-app mt-1 tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
      <p className={clsx(
        'text-xs mt-2',
        isPositive ? 'text-emerald-500' : 'text-red-500'
      )}>
        {isPositive ? '▲' : '▼'} {Math.abs(change)}% from last month
      </p>
    </div>
  )
}
