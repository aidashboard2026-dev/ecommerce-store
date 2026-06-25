import React, { useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  PieChart as PieIcon,
  CircleDashed,
} from 'lucide-react'

import { ordersAPI } from '@/shared/services/api'

const STATUS_CONFIG = [
  {
    key: 'orders',
    name: 'Orders',
    color: '#6366f1',
    track: 'bg-blue-100 dark:bg-blue-950/50',
    bar: 'bg-blue-500',
  },
  {
    key: 'shipped',
    name: 'Shipped',
    color: '#f59e0b',
    track: 'bg-amber-100 dark:bg-amber-950/50',
    bar: 'bg-amber-500',
  },
  {
    key: 'delivered',
    name: 'Delivery',
    color: '#10b981',
    track: 'bg-emerald-100 dark:bg-emerald-950/50',
    bar: 'bg-emerald-500',
  },
  {
    key: 'cancelled',
    name: 'Cancel',
    color: '#ef4444',
    track: 'bg-red-100 dark:bg-red-950/50',
    bar: 'bg-red-500',
  },
]

const RADIAN = Math.PI / 180

const normalizeStatus = (status = '') => status.toLowerCase()

const renderCalloutLabel = ({ cx, cy, midAngle, outerRadius, name, percent, fill }) => {
  if (!percent) return null

  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const sx = cx + (outerRadius + 4) * cos
  const sy = cy + (outerRadius + 4) * sin
  const mx = cx + (outerRadius + 18) * cos
  const my = cy + (outerRadius + 18) * sin
  const ex = mx + (cos >= 0 ? 22 : -22)
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
      <circle cx={ex} cy={ey} r={3} fill={fill} />
      <text
        x={ex + (cos >= 0 ? 7 : -7)}
        y={ey - 4}
        textAnchor={textAnchor}
        fill={fill}
        className="text-[11px] font-semibold"
      >
        {name}
      </text>
      <text
        x={ex + (cos >= 0 ? 7 : -7)}
        y={ey + 10}
        textAnchor={textAnchor}
        fill={fill}
        className="text-[10px]"
      >
        {Math.round(percent * 100)}%
      </text>
    </g>
  )
}

export default function OrderStatusAnalytics({ isDark }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState('donut')

  const toggleChartType = () => {
    setChartType((prev) => (prev === 'donut' ? 'pie' : 'donut'))
  }

  useEffect(() => {
    let active = true

    async function loadOrders() {
      try {
        const response = await ordersAPI.list(0, 10000)
        if (active) setOrders(response.data)
      } catch (error) {
        console.error(error)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOrders()
    const refreshTimer = window.setInterval(loadOrders, 15000)
    window.addEventListener('focus', loadOrders)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', loadOrders)
    }
  }, [])

  const chartData = useMemo(() => {
    const counts = orders.reduce(
      (acc, order) => {
        const status = normalizeStatus(order.tracking_status)

        if (status === 'shipped') acc.shipped += 1
        else if (status === 'delivered' || status === 'delivery') acc.delivered += 1
        else if (status === 'cancelled' || status === 'canceled' || status === 'cancel') acc.cancelled += 1
        else acc.orders += 1

        return acc
      },
      { orders: 0, shipped: 0, delivered: 0, cancelled: 0 }
    )

    const total = STATUS_CONFIG.reduce((sum, item) => sum + counts[item.key], 0)

    return STATUS_CONFIG.map((item) => ({
      ...item,
      value: counts[item.key],
      percentage: total > 0 ? (counts[item.key] / total) * 100 : 0,
    }))
  }, [orders])

  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  const visibleChartData = total > 0 ? chartData : [{ name: 'No orders', value: 1, color: isDark ? '#242a37' : '#e2e8f0' }]

  const tooltipStyle = {
    backgroundColor: isDark ? '#16192A' : '#fff',
    border: `1px solid ${isDark ? '#242a37' : '#e2e8f0'}`,
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
    color: isDark ? '#f1f5f9' : '#0f172a',
    fontSize: '12px',
  }

  return (
    <div className="card w-full min-w-0 p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-app">
            Order Status Analytics
          </h2>
          <p className="mt-1 text-sm text-muted">
            {loading ? 'Syncing order records...' : `${total.toLocaleString()} live orders`}
          </p>
        </div>
        
        <button
          type="button"
          onClick={toggleChartType}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-app text-muted transition hover:text-app"
          title={chartType === 'donut' ? 'Donut Chart' : 'Pie Chart'}
        >
          {chartType === 'donut' ? (
            <CircleDashed size={16} />
          ) : (
            <PieIcon size={16} />
          )}
        </button>
      </div>

      <div className="relative h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 24, right: 34, bottom: 24, left: 34 }}>
            <Pie
              data={visibleChartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? 58 : 0}
              outerRadius={86}
              paddingAngle={total > 0 ? 3 : 0}
              labelLine={false}
              label={total > 0 ? renderCalloutLabel : false}
              isAnimationActive
              animationDuration={450}
            >
              {visibleChartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke={isDark ? '#16192A' : '#fff'} strokeWidth={3} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                if (total === 0) return ['0 orders', name]
                const item = chartData.find((status) => status.name === name)
                return [`${value} (${Math.round(item?.percentage || 0)}%)`, name]
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {chartType === 'donut' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-app">
                {total.toLocaleString()}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Total
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {chartData.map((item) => (
          <div key={item.key}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-sm font-semibold text-app">{item.name}</span>
              </div>
              <span className="text-xs font-semibold text-muted">
                {item.value.toLocaleString()} ({Math.round(item.percentage)}%)
              </span>
            </div>
            <div className={`h-2 overflow-hidden rounded-full ${item.track}`}>
              <div
                className={`h-full rounded-full ${item.bar} transition-all duration-500`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
