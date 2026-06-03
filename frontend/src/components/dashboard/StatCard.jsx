import React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Shirt } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0))
}

export function TopCategoriesCard({ categories = [],onClick, title = 'Top Categories' }) {
  const rows = categories.length
    ? categories
    : [{ name: 'No categories', styles: 0 }]

  return (
    <div className={`min-h-[176px] rounded-lg border border-app bg-surface p-5 shadow-card transition-all duration-200 hover:shadow-md hover:border-green-500 dark:hover:bg-slate-900/50 dark:shadow-card-dark ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="font-display text-base font-bold uppercase text-muted sm:text-lg">
          {title}
        </p>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <Shirt size={24} />
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map((category) => (
          <div key={category.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-muted">{category.name}</span>
            <span className="shrink-0 font-display font-bold text-app">
              {formatNumber(category.styles)} {category.styles === 1 ? 'style' : 'styles'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LowStockProductsCard({ count = 0, products = [],onClick, title = 'Low Stock Products' }) {
  const rows = products.length
    ? products
    : [{ id: 'empty', title: 'All products stocked', stock: 0, variants: 0 }]

  return (
    <div className={`min-h-[176px] rounded-lg border border-app bg-surface p-5 shadow-card transition-all duration-200 hover:shadow-md hover:border-green-500 dark:hover:bg-slate-900/50 dark:shadow-card-dark ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold uppercase text-muted sm:text-lg">
            {title}
          </p>
          <p className="mt-2 font-display text-3xl font-bold leading-none text-app">
            {formatNumber(count)}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle size={24} />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {rows.slice(0, 3).map((product) => (
          <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-muted">{product.title}</span>
            <span className="shrink-0 font-display font-bold text-app">
              {formatNumber(product.stock)} left
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettlementCard({ title, value, description, change = 0, onClick, icon: Icon, iconClassName }) {
  const isPositive = change >= 0

  return (
    <div className={`flex min-h-[176px] rounded-lg border border-app bg-surface p-4 shadow-card transition-all duration-200 hover:shadow-md hover:border-green-500 dark:hover:bg-slate-900/50 dark:shadow-card-dark ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="flex flex-1 flex-col justify-evenly">
          <p className="font-display text-base font-bold uppercase text-muted sm:text-lg">{title}</p>
          <p className="mt-2 font-display text-3xl font-bold leading-none text-app">{value}</p>
          <p className="text-sm font-semibold text-muted">{description}</p>
      <p className={clsx(
        'text-xs mt-2',
        isPositive ? 'text-emerald-500' : 'text-red-500'
      )}>
        {isPositive ? '▲' : '▼'} {Math.abs(change)}% from last month
      </p>
      </div>
      <div className="flex flex-col items-center justify-between gap-3" >
        <span className={clsx(
          'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
          isPositive
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
        )}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}%
        </span>
        <div className={`flex h-12 w-12 mb-5 items-center justify-center rounded-md ${iconClassName}`}>
          <Icon size={25} />
        </div>
      </div>
    </div>
  )
}

export default function StatCard({ title, value, change, icon: Icon, iconClassName, prefix = '', suffix = '', onClick }) {
  const isPositive = change >= 0

  return (
    <div className={`flex min-h-[176px] rounded-lg border border-app bg-surface p-4 shadow-card transition-all duration-200 hover:bg-green-100 hover:border-green-500 dark:hover:bg-slate-900/50 dark:shadow-card-dark ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="flex flex-1 flex-col justify-evenly">
         <p className="text-muted text-sm font-medium">{title}</p>
      <p className="text-2xl font-display font-bold text-app mt-1 tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
        <p className={clsx(
          'text-xs',
          isPositive ? 'text-emerald-500' : 'text-red-500'
        )}>
          {isPositive ? '▲' : '▼'} {Math.abs(change)}% from last month
        </p>
      </div>
      <div className="flex flex-col items-center justify-between gap-3">
        <span className={clsx(
          'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
          isPositive
            ? 'bg-emerald-500 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
        )}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}%
        </span>
        <div className={`flex h-12 w-12 mb-5 items-center justify-center rounded-md ${iconClassName}`}>
          <Icon size={25} className="text-green" />
        </div>
      </div>
    </div>
  )
}
