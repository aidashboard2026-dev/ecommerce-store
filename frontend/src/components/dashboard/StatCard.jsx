import React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Shirt } from 'lucide-react'
import clsx from 'clsx'

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0))
}

export function TopCategoriesCard({ categories = [], onClick, title = 'Top Categories' }) {
  const rows = categories.length
    ? categories
    : [{ name: 'No categories', styles: 0 }]

  return (
    <div 
      className={clsx(
        "card p-5 hover:border-brand-500/50 cursor-pointer flex flex-col justify-between min-h-[160px]",
        onClick ? 'cursor-pointer' : ''
      )} 
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {title}
          </p>
          <div className="mt-3 space-y-2">
            {rows.slice(0, 3).map((category) => (
              <div key={category.name} className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-app truncate max-w-[120px]">{category.name}</span>
                <span className="text-muted font-medium">({formatNumber(category.styles)} styles)</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <Shirt size={18} />
        </div>
      </div>
    </div>
  )
}

export function LowStockProductsCard({ count = 0, products = [], onClick, title = 'Low Stock Products' }) {
  const rows = products.length
    ? products
    : [{ id: 'empty', title: 'All products stocked', stock: 0 }]

  return (
    <div 
      className={clsx(
        "card p-5 hover:border-red-500/50 flex flex-col justify-between min-h-[160px]",
        onClick ? 'cursor-pointer' : ''
      )} 
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight text-app">
            {formatNumber(count)}
          </p>
          <div className="mt-2.5 space-y-1.5">
            {rows.slice(0, 2).map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium text-muted">{product.title}</span>
                <span className="shrink-0 font-bold text-red-500">
                  {formatNumber(product.stock)} left
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
          <AlertTriangle size={18} />
        </div>
      </div>
    </div>
  )
}

export function SettlementCard({ title, value, description, change = 0, onClick, icon: Icon, iconClassName }) {
  const isPositive = change >= 0

  return (
    <div 
      className={clsx(
        "card p-5 hover:border-brand-500/50 flex flex-col justify-between min-h-[160px]",
        onClick ? 'cursor-pointer' : ''
      )} 
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight text-app">{value}</p>
          <p className="text-[11px] font-medium text-muted mt-1.5 truncate">{description}</p>
        </div>
        <div className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500", iconClassName)}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className={clsx(
          'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
          isPositive
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        )}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(change)}%
        </span>
        <span className="text-[10px] font-semibold text-muted">vs last month</span>
      </div>
    </div>
  )
}

export default function StatCard({ title, value, change, icon: Icon, iconClassName, prefix = '', suffix = '', onClick, className }) {
  const isPositive = change >= 0

  let displayValue
  if (typeof prefix === 'function') {
    try {
      displayValue = prefix(value)
    } catch (e) {
      displayValue = String(value)
    }
  } else {
    displayValue = `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}${suffix}`
  }

  return (
    <div
      className={clsx(
        'card p-5 hover:border-brand-500/50 flex flex-col justify-between min-h-[160px]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
          <p className="mt-1.5 font-display text-3.5xl font-bold tracking-tight text-app">
            {displayValue}
          </p>
        </div>
        <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
          <Icon size={18} className="text-current" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className={clsx(
          'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
          isPositive
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        )}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(change)}%
        </span>
        <span className="text-[10px] font-semibold text-muted">vs last month</span>
      </div>
    </div>
  )
}
