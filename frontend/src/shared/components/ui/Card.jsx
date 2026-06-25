import clsx from 'clsx'

export function Card({ children, className, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'card border border-app rounded-xl shadow-sm overflow-hidden',
        hover && 'hover:border-brand-500/50 hover:shadow-card-hover hover:translate-y-[-1px] cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={clsx('flex flex-col gap-1.5 p-5 border-b border-app/50', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3 className={clsx('font-display font-bold text-sm text-app leading-tight', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={clsx('text-xs text-muted leading-relaxed', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={clsx('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div className={clsx('flex items-center justify-between p-5', className)} {...props}>
      {children}
    </div>
  )
}

export default Card
