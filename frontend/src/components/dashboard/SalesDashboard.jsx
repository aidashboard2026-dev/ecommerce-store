import React, { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { BarChart3, ChevronLeft, ChevronRight, LineChart as LineChartIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { dashboardAPI } from '../../services/api'

const todayISO = () => new Date().toISOString().slice(0, 10)

const parseISODate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const toISODate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0)

function ControlButton({ active, children, className, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95',
        active
          ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
          : 'border border-app bg-app text-muted hover:text-app',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export default function SalesDashboard({ isDark }) {
  const [period, setPeriod] = useState('weekly')
  const [chartType, setChartType] = useState('bar')
  const [anchorDate, setAnchorDate] = useState(todayISO)
  const [sales, setSales] = useState({ data: [], range_label: '' })
  const [loading, setLoading] = useState(true)

  const gridColor = isDark ? '#242a37' : '#e2e8f0'
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const chartData = sales.data || []
  const totalSales = useMemo(
    () => chartData.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [chartData]
  )

  const loadSales = useCallback(async () => {
    try {
      const response = await dashboardAPI.salesChart(period, anchorDate)
      setSales(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [period, anchorDate])

  useEffect(() => {
    setLoading(true)
    loadSales()

    const refreshTimer = window.setInterval(loadSales, 15000)
    window.addEventListener('focus', loadSales)

    return () => {
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', loadSales)
    }
  }, [loadSales])

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod)
    setAnchorDate(todayISO())
  }

  const movePeriod = (direction) => {
    setAnchorDate((current) => {
      const next = parseISODate(current)
      if (period === 'weekly') {
        next.setDate(next.getDate() + direction * 7)
      } else {
        next.setMonth(next.getMonth() + direction)
      }
      return toISODate(next)
    })
  }

  const tooltipStyle = {
    backgroundColor: isDark ? '#16192A' : '#fff',
    border: `1px solid ${isDark ? '#242a37' : '#e2e8f0'}`,
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
    color: isDark ? '#f1f5f9' : '#0f172a',
    fontSize: '12px',
  }

  const sharedChartProps = {
    data: chartData,
    margin: { top: 10, right: 10, left: 2, bottom: 0 },
  }

  return (
    <div className="card p-5 shadow-sm sm:p-6 xl:col-span-2">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-app">Sales Dashboard</h2>
            <p className="mt-1 text-sm text-muted">
              {sales.range_label || 'Live sales from order records'} - {formatCurrency(totalSales)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-app p-1">
            <ControlButton active={period === 'weekly'} onClick={() => handlePeriodChange('weekly')}>
              Weekly
            </ControlButton>
            <ControlButton active={period === 'monthly'} onClick={() => handlePeriodChange('monthly')}>
              Monthly
            </ControlButton>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-app p-1">
            <ControlButton active={chartType === 'bar'} onClick={() => setChartType('bar')}>
              <BarChart3 size={15} />
              Bar
            </ControlButton>
            <ControlButton active={chartType === 'line'} onClick={() => setChartType('line')}>
              <LineChartIcon size={15} />
              Line
            </ControlButton>
          </div>
        </div>
      </div>

      <div className={clsx('h-[280px] transition-opacity duration-200', loading && 'opacity-60')}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart key={`bar-${period}`} {...sharedChartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                width={68}
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                label={{
                  value: 'Sales Amount',
                  angle: -90,
                  position: 'insideLeft',
                  fill: textColor,
                  fontSize: 11,
                }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(value), 'Sales Amount']} />
              <Bar dataKey="amount" fill="#5865f2" radius={[8, 8, 3, 3]} barSize={period === 'weekly' ? 34 : 18} />
            </BarChart>
          ) : (
            <LineChart key={`line-${period}`} {...sharedChartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                width={68}
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                label={{
                  value: 'Sales Amount',
                  angle: -90,
                  position: 'insideLeft',
                  fill: textColor,
                  fontSize: 11,
                }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(value), 'Sales Amount']} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#5865f2"
                strokeWidth={3}
                dot={{ r: 4, fill: '#5865f2', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#5865f2', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-app pt-4">
        <button
          type="button"
          onClick={() => movePeriod(-1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-app text-muted transition-all duration-200 hover:text-app active:scale-95"
          aria-label={period === 'weekly' ? 'Previous week' : 'Previous month'}
        >
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold text-app">
          {period === 'weekly' ? 'Week' : '12 months ending'} - {sales.range_label || anchorDate}
        </p>
        <button
          type="button"
          onClick={() => movePeriod(1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-app text-muted transition-all duration-200 hover:text-app active:scale-95"
          aria-label={period === 'weekly' ? 'Next week' : 'Next month'}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
