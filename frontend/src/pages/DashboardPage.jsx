import React, { useEffect, useState } from 'react'
import { Users, Package, DollarSign, Activity, UserPlus, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts'
import { dashboardAPI } from '../services/api'
import StatCard from '../components/dashboard/StatCard'
import { PageLoader } from '../components/common/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useAuth'

const activityIcons = {
  user_created: UserPlus,
  product_updated: Package,
  login: Activity,
  revenue: TrendingUp,
  alert: AlertTriangle,
}

const activityColors = {
  user_created: 'text-brand-500 bg-brand-50 dark:bg-brand-950/40',
  product_updated: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40',
  login: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  revenue: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
  alert: 'text-red-500 bg-red-50 dark:bg-red-950/40',
}

export default function DashboardPage() {
  const { admin } = useAuth()
  const { isDark } = useTheme()
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, chartRes, actRes] = await Promise.all([
          dashboardAPI.stats(),
          dashboardAPI.chartData(),
          dashboardAPI.recentActivity(),
        ])
        setStats(statsRes.data)
        setChartData(chartRes.data.monthly)
        setActivity(actRes.data.activities)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const gridColor = isDark ? '#1e2535' : '#f1f5f9'
  const textColor = isDark ? '#64748b' : '#94a3b8'

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 py-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display font-bold text-2xl text-app">
          Good day, {admin?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted text-sm mt-1">Here's what's happening across your platform.</p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.total_users}
            change={stats.user_growth}
            icon={Users}
            color="bg-gradient-to-br from-brand-500 to-brand-700"
          />
          <StatCard
            title="Total Products"
            value={stats.total_products}
            change={stats.product_growth}
            icon={Package}
            color="bg-gradient-to-br from-violet-500 to-violet-700"
          />
          <StatCard
            title="Total Revenue"
            value={stats.total_revenue.toFixed(0)}
            change={stats.revenue_growth}
            icon={DollarSign}
            color="bg-gradient-to-br from-emerald-500 to-emerald-700"
            prefix="$"
          />
          <StatCard
            title="Active Sessions"
            value={stats.active_sessions}
            change={stats.session_growth}
            icon={Activity}
            color="bg-gradient-to-br from-amber-500 to-orange-600"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue area chart */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-lg text-app">Revenue Overview</h2>
              <p className="text-muted text-sm">Monthly revenue for 2024</p>
            </div>
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-semibold">
              ↑ 12.5%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5865f2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#5865f2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#16192A' : '#fff',
                  border: `1px solid ${isDark ? '#242a37' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  fontSize: '12px',
                }}
                formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#5865f2" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#5865f2' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User growth bar chart */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="font-display font-bold text-lg text-app">User Growth</h2>
            <p className="text-muted text-sm">New users per month</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.slice(-6)} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#16192A' : '#fff',
                  border: `1px solid ${isDark ? '#242a37' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
              />
              <Bar dataKey="users" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-muted" />
          <h2 className="font-display font-bold text-lg text-app">Recent Activity</h2>
        </div>
        <div className="space-y-3">
          {activity.map((item) => {
            const Icon = activityIcons[item.type] || Activity
            const colorClass = activityColors[item.type] || activityColors.alert
            return (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface transition-colors duration-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-app">{item.message}</p>
                  <p className="text-xs text-muted mt-0.5">{item.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
