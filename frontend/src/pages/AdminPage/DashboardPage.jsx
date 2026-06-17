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

    const refreshTimer = window.setInterval(load, 6000)
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
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Premium Gradient Greeting Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-indigo-700/20">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between items-start  gap-6">
          
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/95 text-[9px] font-bold uppercase tracking-wider border border-white/10">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-glow-sm" />
              Live Merchant 
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display">
              Welcome back, {adminFirstName}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-3xl">
              Your merchant catalog features <span className="font-bold text-white">{liveProductCount} active styles</span> online. Take a look at recent logs, process orders, or update catalog inventory.
            </p>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('admin/settings')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              Manage Store
            </button>
            <button
              type="button"
              onClick={() => navigate('admin/products')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all active:scale-95 border border-white/15 shadow-sm"
            >
              <Eye size={14} />
              Products List
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
            iconClassName="text-indigo-600 border-indigo-500/10 dark:text-indigo-400"
            onClick={() => navigate('admin/customers')}
          />
          <StatCard
            title="Total Products"
            value={stats.total_products}
            change={stats.product_growth}
            icon={Package}
            iconClassName="text-violet-600 border-violet-500/10 dark:text-violet-400"
            onClick={() => navigate('admin/products')}
          />
          <StatCard
            title="Published Items"
            value={stats.published_products}
            change={stats.published_growth || 0}
            icon={Activity}
            iconClassName="text-emerald-600 border-emerald-500/10 dark:text-emerald-400"
            onClick={() => navigate('admin/products')}
          />
          <LowStockProductsCard
            title="Low Stock Products"
            count={stats.low_stock_product_count}
            products={stats.low_stock_products}
            onClick={() => navigate('admin/products')}
          />
        </div>
      )}

      {/* Analytics Charts section */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
            iconClassName="text-emerald-600 border-emerald-500/10 dark:text-emerald-400"
            prefix={formatCurrency}
            onClick={() => navigate('admin/orders')}
          />
          <SettlementCard
            title="Cash Revenue"
            value={formatCurrency(stats.cash_revenue)}
            description="Offline settled sales value"
            change={stats.cash_revenue_growth || 0}
            icon={Banknote}
            iconClassName="text-emerald-500"
            onClick={() => navigate('admin/orders')}
          />
          <SettlementCard
            title="UPI Revenue"
            value={formatCurrency(stats.upi_revenue)}
            description="Online transactions sales value"
            change={stats.upi_revenue_growth || 0}
            icon={Smartphone}
            iconClassName="text-sky-500"
            onClick={() => navigate('admin/orders')}
          />
          <TopCategoriesCard
            title="Top Categories"
            categories={stats.top_categories}
            onClick={() => navigate('admin/products')}
          />
        </div>
      )}

      {/* Recent Activity Card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-app">
          <Clock size={15} className="text-muted" />
          <h2 className="font-bold text-xs text-app uppercase tracking-wider">Recent System Logs</h2>
        </div>
        <div className="relative border-l border-app ml-3 space-y-5">
          {activity.map((item) => {
            const Icon = activityIcons[item.type] || Activity
            const colorClass = activityColors[item.type] || activityColors.alert
            return (
              <div key={item.id} className="relative pl-6 flex items-start gap-4 transition-all">
                {/* Timeline node */}
                <div className="absolute -left-3.5 top-0.5 w-7 h-7 rounded-full bg-surface border border-app flex items-center justify-center text-app shadow-sm">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center ${colorClass}`}>
                    <Icon size={11} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-app">{item.message}</p>
                  <p className="text-[10px] text-muted font-medium mt-1">{item.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
