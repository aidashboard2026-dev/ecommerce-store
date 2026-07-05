import React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Shirt } from 'lucide-react'
import clsx from 'clsx'

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

const categoryBadgeClasses = [
  'bg-amber-500/10 text-amber-600 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400',
  'bg-emerald-500/10 text-emerald-600 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400',
  'bg-sky-500/10 text-sky-600 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-400',
]

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
        "card p-3 hover:border-orange-500/50 hover:shadow-card-hover hover:translate-y-[-1px] flex flex-col justify-between min-h-[150px]",
        onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/50' : ''
      )} 
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex flex-col items-start justify-between w-full gap-2">
        <div className="flex justify-between items-center min-w-0 w-full">
          <p className="text-[10px] p-2 font-bold uppercase tracking-wider text-muted">
            {title}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/5 text-amber-600 border border-amber-500/10 shadow-sm">
            <Shirt size={15} />
          </div>
          
        </div>
        
        <div className="flex flex-col gap-1 w-full">
            {rows.slice(0, 3).map((category, index) => (
              <div key={category.name} className="flex w-full items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold text-app">{category.name}</span>
                <span
                  className={clsx(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                    categoryBadgeClasses[index % categoryBadgeClasses.length]
                  )}
                >
                  {formatNumber(category.styles)} styles
                </span>
              </div>
            ))}
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
        'card p-5 hover:border-red-500/50 hover:shadow-card-hover hover:translate-y-[-1px] flex flex-col justify-between min-h-[150px] w-full',
        onClick && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/50'
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex h-full w-full flex-col justify-between">
        <div className="flex w-full items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{title}</p>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/5 text-red-600 border border-red-500/10 shadow-sm">
            <AlertTriangle size={15} />
          </div>
        </div>

        <div className="w-full">
          <p className=" font-display text-4xl font-bold tracking-tight leading-none">
            {formatNumber(count)}
          </p>
        </div>

        <div className="mt-2.5 w-full space-y-1.5">
          {rows.slice(0, 2).map((product) => (
            <div key={product.id} className="flex w-full items-center justify-between gap-2 text-[11px]">
              <span className="min-w-0 truncate font-semibold text-muted">{product.title}</span>
              <span className="shrink-0 font-bold text-red-500">
                {formatNumber(product.stock)} left
              </span>
            </div>
          ))}
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
        "card p-5 hover:border-brand-500/50 hover:shadow-card-hover hover:translate-y-[-1px] flex flex-col justify-between min-h-[150px]",
        onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400/50' : ''
      )} 
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex-1 flex items-start justify-between">
        <div className="flex-1 flex flex-col h-full justify-between min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{title}</p>
          <p className="font-display text-4xl font-bold tracking-tight leading-none">{value}</p>
          <p className="text-[10px] font-medium text-muted mb-1 truncate">{description}</p>
        </div>
        <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm border border-current/10", iconClassName)}>
          <Icon size={15} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={clsx(
          'inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
          isPositive
            ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
            : 'bg-red-500/5 text-red-600 border-red-500/10'
        )}>
          {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {Math.abs(change)}%
        </span>
        <span className="text-[9px] font-semibold text-muted">vs last month</span>
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
        'card p-5 hover:border-brand-500/50 hover:shadow-card-hover hover:translate-y-[-1px] flex justify-between min-h-[150px]',
        onClick && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400/50',
        className
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{title}</p>   
      </div>
       <div className="flex justify-between items-center">
        <p className="mt-1.5 font-display text-4xl font-bold tracking-tight leading-none">
            {displayValue}
          </p>
        
        </div>
      <div className="flex items-center gap-1.5">
        <span className={clsx(
          'inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
          isPositive
            ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
            : 'bg-red-500/5 text-red-600 border-red-500/10'
        )}>
          {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {Math.abs(change)}%
        </span>
        <span className="text-[9px] font-semibold text-muted">vs last month</span>
      </div>
      </div>

      <div>
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm border border-current/10', iconClassName)}>
          <Icon size={20} className="text-current" />
      </div>
      </div>
    </div>
  )
}
