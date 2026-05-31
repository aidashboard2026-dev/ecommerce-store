import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Package, DollarSign, Activity, UserPlus, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

import { dashboardAPI } from '../services/api'
import StatCard from '../components/dashboard/StatCard'
import SalesDashboard from '../components/dashboard/SalesDashboard'
import OrderStatusAnalytics from '../components/dashboard/OrderStatusAnalytics'
import { PageLoader } from '../components/common/Spinner'
import { useAuth, useTheme } from '../hooks/useAuth'

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
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [statsRes, actRes] = await Promise.all([
          dashboardAPI.stats(),
          dashboardAPI.recentActivity(),
        ])
        if (active) {
          setStats(statsRes.data)
          setActivity(actRes.data.activities)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    const refreshTimer = window.setInterval(load, 15000)
    window.addEventListener('focus', load)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', load)
    }
  }, [])

  const adminFirstName = admin?.name?.split(' ')[0] || 'Admin'
  const liveProductCount = stats?.total_products ?? 4

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 py-6">
      <div className="mx-auto w-[80%] gap-20 rounded-[10px] bg-blue-600 p-10 text-white shadow-sm sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-col sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-[10px] bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Live Merchant
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-white">
              Greetings, {adminFirstName}
            </h1>
            <p className="mt-1 text-sm text-blue-50">
              Your catalog features {liveProductCount} live products online. Review real-time sales trends, resolve Physical variant shortages, and deploy custom discount offers.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="rounded-[10px] bg-white px-10 py-2.5 text-sm font-semibold text-blue-700 transition-colors duration-150 hover:bg-blue-50 active:scale-95"
            >
              Manage catalog
            </button>
            <button
              type="button"
              onClick={() => navigate('/Products')}
              className="rounded-[10px] border border-white/40 bg-blue-700 px-10 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-800 active:scale-95"
            >
              Preview store..!!
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            value={Number(stats.total_revenue || 0).toFixed(0)}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SalesDashboard isDark={isDark} />
        <OrderStatusAnalytics isDark={isDark} />
      </div>

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
