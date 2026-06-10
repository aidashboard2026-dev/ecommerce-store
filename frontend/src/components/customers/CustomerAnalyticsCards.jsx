import React from 'react'
import { Users, UserCheck, UserX, UserPlus, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

function Card({ icon: Icon, label, value, iconClass, sub }) {
  return (
    <div className="stat-card dark:hover:bg-slate-900/50 dark:shadow-card-dark">
      <div className="flex flex-row justify-between">
        <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', iconClass)}>
          <Icon size={16} className="text-current" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-3xl font-bold font-display text-app">{value}</p>
        <p className="text-sm font-medium text-muted">{label}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
    </div>
  )
}

export default function CustomerAnalyticsCards({ analytics }) {
  if (!analytics) return null

  const { total_customers, active_customers, inactive_customers, new_this_month, top_spenders } = analytics
  const topSpender = top_spenders?.[0]

  const fmt = (n) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n || 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card
        icon={Users}
        label="Total Customers"
        value={total_customers?.toLocaleString() ?? '—'}
        iconClass="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"
      />
      <Card
        icon={UserCheck}
        label="Active"
        value={active_customers?.toLocaleString() ?? '—'}
        iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
      />
      <Card
        icon={UserX}
        label="Inactive"
        value={inactive_customers?.toLocaleString() ?? '—'}
        iconClass="bg-gray-100 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400"
      />
      <Card
        icon={UserPlus}
        label="New This Month"
        value={new_this_month?.toLocaleString() ?? '—'}
        iconClass="bg-brand-100 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"
      />
      <Card
        icon={TrendingUp}
        label="Top Spender"
        value={topSpender ? fmt(topSpender.total_spent) : '—'}
        sub={topSpender ? topSpender.name : undefined}
        iconClass="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
      />
    </div>
  )
}
