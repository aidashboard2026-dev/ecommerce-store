import React from 'react'
import clsx from 'clsx'

export function Table({ children, className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={clsx('w-full text-left border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className, ...props }) {
  return (
    <thead className={clsx('border-b border-app bg-app/40', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className, ...props }) {
  return (
    <tbody className={clsx('divide-y divide-app/50', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className, hover = true, ...props }) {
  return (
    <tr
      className={clsx(
        'transition-colors',
        hover && 'hover:bg-app/40 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className, ...props }) {
  return (
    <th
      className={clsx(
        'px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted select-none',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ children, className, ...props }) {
  return (
    <td
      className={clsx(
        "px-4 py-3.5 text-xs text-app font-normal whitespace-nowrap align-middle",
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}
