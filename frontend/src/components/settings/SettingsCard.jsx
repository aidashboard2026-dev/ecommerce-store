import React from 'react'
import clsx from 'clsx'

export default function SettingsCard({ title, subtitle, icon: Icon, accent = 'indigo', actions, children, className }) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200',
  }

  return (
    <section className={clsx('rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900', className)}>
      <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accents[accent])}>
              <Icon size={18} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="px-4">{children}</div>
    </section>
  )
}
