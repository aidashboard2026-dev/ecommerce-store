import { TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'

export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconClassName,
  description,
  onClick,
  className,
  ...props
}) {
  const hasChange = typeof change === 'number'
  const isPositive = hasChange && change >= 0

  return (
    <div onClick={onClick}
      className={clsx(
        'card p-5 border border-app rounded-xl shadow-sm flex flex-col justify-between min-h-[140px] transition-all duration-200',
        onClick && 'cursor-pointer hover:border-brand-500/50 hover:shadow-card-hover hover:translate-y-[-1px]',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">

          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-app leading-none">
            {value}
          </p>
          {description && (
            <p className="text-[10px] font-medium text-muted mt-1.5 truncate">{description}</p>
          )}
        </div>
        {Icon && (
          <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app border border-app/50 text-muted shadow-sm', iconClassName)}>
            <Icon size={15} />
          </div>
        )}
      </div>

      {hasChange && (
        <div className="mt-3.5 flex items-center gap-1.5">
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
              isPositive
                ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
                : 'bg-red-500/5 text-red-600 border-red-500/10'
            )}
          >
            {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {Math.abs(change)}%
          </span>
          <span className="text-[9px] font-semibold text-muted">vs last period</span>
        </div>
      )}
    </div>
  )
}
