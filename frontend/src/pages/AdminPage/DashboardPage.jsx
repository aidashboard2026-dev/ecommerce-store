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

import { CustomersIcon } from '../components/img/icons'

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

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0))
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
    <div className="space-y-6 py-6 mx-auto min-w-[80%] max-w-6xl">
      <div className="hero-banner">
        <div className="flex flex-col gap-2 sm:flex-col sm:items-start sm:justify-between">
          <div className="flex flex-col gap-0">
            <span className="hero-badge">
              <span className="h-2 w-2 rounded-full bg-green-400 mr-2 shadow-glow-sm"></span>
              Live Merchant
            </span>
            <h1 className="hero-title">
              <span className="text-sm pl-0 pb-2">Greetings, </span>
             {adminFirstName}
            </h1>
            <p className="hero-desc">
              Your catalog features{" "} <span className="font-bold text-white">{liveProductCount} live products</span> currently available online. Monitor real time sales performance, track inventory levels across all variants, identify low-stock or out of stock physical products, and respond quickly to changing customer demand. Create and deploy custom discount campaigns, optimize product visibility, and make data driven decisions to maximize revenue growth and customer engagement.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[460px]:flex-row">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="btn btn-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
</svg>

              Manage catalog
            </button>
            <button
              type="button"
              onClick={() => navigate('/Products')}
              className="btn btn-ghost"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--ghost-color)" className="size-4">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>

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
            // valueClassName="text-blue-700 dark:text-blue-700"
            change={stats.user_growth}
            icon={CustomersIcon}
            iconClassName="bg-blue-100/50 text-blue-700 dark:bg-gray-800/50 dark:text-blue-300"
            onClick={() => navigate('/Customers')}
          />
          <StatCard
            title="Total Products"
            value={stats.total_products}
            // valueClassName="text-[var(--productcard-bg)] "
            change={stats.product_growth}
            icon={Package}
            iconClassName="bg-gray-200/50 text-[var(--productcard-bg)]  dark:bg-gray-800/50 dark:text-[var(--productcard-bg)]"
            onClick={() => navigate('/Products')}
          />
         
          <StatCard
            title="Published Products"
            value={stats.published_products}
            // valueClassName="text-emerald-700 dark:text-emerald-300"
            // change={stats.published_growth}
            icon={Activity}
            iconClassName="bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            onClick={() => navigate('/Products')}
          />
          <LowStockProductsCard
            title="Low Stock Products"
            count={stats.low_stock_product_count}
            products={stats.low_stock_products}
            onClick={() => navigate('/Products')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SalesDashboard isDark={isDark} />
        <OrderStatusAnalytics isDark={isDark} />
      </div>
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          
           <StatCard className=" "
            title="Total Revenue"
            value={Number(stats.total_revenue || 0).toFixed(0)}
            change={stats.revenue_growth}
            icon={DollarSign}
            iconClassName="bg-gradient-to-br from-emerald-500 to-emerald-700"
            prefix={formatCurrency}
            onClick={() => navigate('/Orders')}
          />
          <SettlementCard
            title="Cash Revenue"
            value={formatCurrency(stats.cash_revenue)}
            description="Total cash settled offline"
            change={stats.cash_revenue_growth || 0}
            icon={Banknote}
            iconClassName="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
            onClick={() => navigate('/Orders')}
          />
          <SettlementCard
            title="UPI Revenue"
            value={formatCurrency(stats.upi_revenue)}
            description="Total cash settled online"
            change={stats.upi_revenue_growth || 0}
            icon={Smartphone}
            iconClassName="bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
            onClick={() => navigate('/Orders')}
          />
          <TopCategoriesCard 
            title="Top Categories" 
            categories={stats.top_categories} 
            onClick={() => navigate('/Products')}
          />
          
        </div>
      )}
      
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
