import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Package,
  DollarSign,
  Activity,
  UserPlus,
  Clock,
  AlertTriangle,
  TrendingUp,
  Banknote,
  Smartphone,
  Eye,
  Menu
} from 'lucide-react'

import { dashboardAPI } from '../../services/api'
import StatCard, { TopCategoriesCard, LowStockProductsCard, SettlementCard } from '../../components/dashboard/StatCard'
import SalesDashboard from '../../components/dashboard/SalesDashboard'
import OrderStatusAnalytics from '../../components/dashboard/OrderStatusAnalytics'
import { PageLoader } from '../../components/common/Spinner'
import { useAuth, useTheme } from '../../hooks/useAuth'

import { CustomersIcon } from "../../components/img/icons";

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

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0))
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
          setActivity(actRes.data.activities || [])
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
  const liveProductCount = stats?.total_products ?? 0

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Premium Gradient Greeting Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-700 to-brand-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-4xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-bold uppercase tracking-wider border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-glow-sm" />
              Live Merchant Node
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Greetings, {adminFirstName}
            </h1>
            <p className="text-xs sm:text-sm text-brand-100/90 leading-relaxed">
              Your catalog features <span className="font-bold text-white">{liveProductCount} live products</span> currently available online. Monitor sales performance, track inventory status, deploy promotion campaigns, and inspect logistics updates.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-brand-50 text-brand-950 text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              Manage Catalog
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all active:scale-95 border border-white/15 shadow-sm"
            >
              <Eye size={14} />
              Preview Store
            </button>
          </div>
        </div>
      </div>

      {/* Primary Analytics Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.total_users}
            change={stats.user_growth}
            icon={CustomersIcon}
            iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            onClick={() => navigate('/customers')}
          />
          <StatCard
            title="Total Products"
            value={stats.total_products}
            change={stats.product_growth}
            icon={Package}
            iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            onClick={() => navigate('/products')}
          />
          <StatCard
            title="Published Items"
            value={stats.published_products}
            change={stats.published_growth || 0}
            icon={Activity}
            iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            onClick={() => navigate('/products')}
          />
          <LowStockProductsCard
            title="Low Stock Products"
            count={stats.low_stock_product_count}
            products={stats.low_stock_products}
            onClick={() => navigate('/products')}
          />
        </div>
      )}

      {/* Analytics Charts section */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SalesDashboard isDark={isDark} />
        <OrderStatusAnalytics isDark={isDark} />
      </div>

      {/* Secondary Financial Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={Number(stats.total_revenue || 0).toFixed(0)}
            change={stats.revenue_growth}
            icon={DollarSign}
            iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            prefix={formatCurrency}
            onClick={() => navigate('/orders')}
          />
          <SettlementCard
            title="Cash Revenue"
            value={formatCurrency(stats.cash_revenue)}
            description="Offline settled sales value"
            change={stats.cash_revenue_growth || 0}
            icon={Banknote}
            iconClassName="bg-emerald-500/10 text-emerald-500"
            onClick={() => navigate('/orders')}
          />
          <SettlementCard
            title="UPI Revenue"
            value={formatCurrency(stats.upi_revenue)}
            description="Online transactions sales value"
            change={stats.upi_revenue_growth || 0}
            icon={Smartphone}
            iconClassName="bg-sky-500/10 text-sky-500"
            onClick={() => navigate('/orders')}
          />
          <TopCategoriesCard
            title="Top Categories"
            categories={stats.top_categories}
            onClick={() => navigate('/products')}
          />
        </div>
      )}

      {/* Recent Activity Card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} className="text-muted" />
          <h2 className="font-bold text-sm text-app uppercase tracking-wider">Recent Activity Log</h2>
        </div>
        <div className="divide-y divide-app">
          {activity.map((item) => {
            const Icon = activityIcons[item.type] || Activity
            const colorClass = activityColors[item.type] || activityColors.alert
            return (
              <div key={item.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0 transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-app">{item.message}</p>
                  <p className="text-[10px] text-muted font-medium mt-0.5">{item.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
