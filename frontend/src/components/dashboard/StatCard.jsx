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
    <div className={`stat-card dark:hover:bg-slate-900/50 dark:shadow-card-dark ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className=" flex items-start justify-between gap-3">
        <p className="sm:text-lg font-semibold text-muted">{title}</p>
      </div>
      <div className="flex flex-row items-center justify-between gap-3">
        <p className="mt-2 font-display text-5xl font-bold leading-none text-app">
          {formatNumber(count)}
        </p>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-300">
          <AlertTriangle size={24} />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {rows.slice(0, 3).map((product) => (
          <div key={product.id} className="flex items-center justify-between gap-3 text-sm text-red-700">
            <span className="min-w-0 truncate font-semibold text-black dark:text-gray-600">{product.title}</span>
            <span className="shrink-0 font-display font-bold text-app text-red-600">
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
    <div className={`stat-card dark:hover:bg-slate-900/50 dark:shadow-card-dark ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
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
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-300 dark:text-emerald-400'
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

export default function StatCard({ title, value, change, icon: Icon, valueClassName, iconClassName, prefix = '', suffix = '', onClick, className }) {
  const isPositive = change >= 0

  // support `prefix` as either a string (literal prefix) or a formatter function
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
        'stat-card dark:hover:bg-slate-900/50 dark:shadow-card-dark',
      onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex flex-row justify-between  ">
        <div className={clsx('flex h-12 w-12 items-center justify-center rounded-md', iconClassName)}>
          <Icon size={18} className="text-current" />
        </div>
        
        <span className={clsx(
          'flex items-center h-fit text-xs  font-semibold px-2 py-1 rounded-xl gap-1',
          isPositive
            ? 'text-emerald-800 bg-emerald-50  rounded-full p-0.5'
            : 'text-red-800 bg-red-100  rounded-full p-0.5 px-2 '
        )}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}%
        </span>
      </div>
      <div className="flex flex-row items-center justify-between gap-3 ">
        <p className="font-medium">{title}</p>
        <p className={clsx("text-5xl font-bold font-display p-0 pl-5 tracking-tight", valueClassName)}>
          {displayValue}
        </p>
        
      </div>
      <div className="flex flex-row items-center justify-star ">
        <p className={clsx(
          'text-xs text-semibold tracking-wider',
          // isPositive ? 'text-emerald-800 bg-emerald-100 border rounded-full p-0.5 px-2 border-emerald-400 dark:border dark:border-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-400'  : 'text-red-800 bg-red-100 border rounded-full p-0.5 px-2 border-red-600'
            isPositive ? 'text-emerald-500' : 'text-red-500'
        )}>
          {isPositive ? '▲' : '▼'} {Math.abs(change)}% from last month
        </p>
      </div>
    </div>
  )
}
