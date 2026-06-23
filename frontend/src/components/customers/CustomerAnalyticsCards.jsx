import React from 'react'
import { Users, UserCheck, UserX, UserPlus, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { Card, CardContent } from '../ui/Card'

function AnalyticsCard({ icon: Icon, label, value, iconClass, sub }) {
  return (
    <Card className="min-h-[120px] flex flex-col justify-between">
      <CardContent className="p-3 flex flex-col justify-between h-full">
        <div className="flex flex-col items-start justify-between gap-3">
          <div className="flex w-full justify-between items-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
            <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm', iconClass)}>
              <Icon size={14} className="text-current" />
            </div>
          </div>

           <p className=" font-display text-4xl font-bold tracking-tight text-app leading-none">
              {value}
            </p>
          
        </div>
        {sub && (
          <p className="text-[10px] font-semibold text-muted truncate border-t border-app/40 pt-2">
            Top Spender: <span className="text-app">{sub}</span>
          </p>
        )}
      </CardContent>
    </Card>
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
      <AnalyticsCard
        icon={Users}
        label="Total Customers"
        value={total_customers?.toLocaleString() ?? '—'}
        iconClass="bg-indigo-500/5 text-indigo-600 border-indigo-500/10"
      />
      <AnalyticsCard
        icon={UserCheck}
        label="Active"
        value={active_customers?.toLocaleString() ?? '—'}
        iconClass="bg-emerald-500/5 text-emerald-600 border-emerald-500/10"
      />
      <AnalyticsCard
        icon={UserX}
        label="Inactive"
        value={inactive_customers?.toLocaleString() ?? '—'}
        iconClass="bg-zinc-500/5 text-zinc-500 border-zinc-500/10"
      />
      <AnalyticsCard
        icon={UserPlus}
        label="New This Month"
        value={new_this_month?.toLocaleString() ?? '—'}
        iconClass="bg-violet-500/5 text-violet-600 border-violet-500/10"
      />
      <AnalyticsCard
        icon={TrendingUp}
        label="Top Spender"
        value={topSpender ? fmt(topSpender.total_spent) : '—'}
        sub={topSpender ? topSpender.name : undefined}
        iconClass="bg-amber-500/5 text-amber-600 border-amber-500/10"
      />
    </div>
  )
}
