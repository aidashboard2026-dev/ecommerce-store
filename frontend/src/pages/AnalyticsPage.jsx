import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import { useTheme } from '../hooks/useAuth'

const monthlyData = [
  { month: 'Jan', revenue: 8200, users: 140, sessions: 1820 },
  { month: 'Feb', revenue: 9100, users: 180, sessions: 2100 },
  { month: 'Mar', revenue: 7800, users: 155, sessions: 1950 },
  { month: 'Apr', revenue: 11200, users: 220, sessions: 2600 },
  { month: 'May', revenue: 10500, users: 198, sessions: 2450 },
  { month: 'Jun', revenue: 13400, users: 260, sessions: 3100 },
  { month: 'Jul', revenue: 12100, users: 240, sessions: 2900 },
  { month: 'Aug', revenue: 14800, users: 295, sessions: 3400 },
  { month: 'Sep', revenue: 13200, users: 270, sessions: 3150 },
  { month: 'Oct', revenue: 15600, users: 320, sessions: 3700 },
  { month: 'Nov', revenue: 14200, users: 290, sessions: 3300 },
  { month: 'Dec', revenue: 16800, users: 350, sessions: 4000 },
]

const trafficSources = [
  { name: 'Direct', value: 35, color: '#5865f2' },
  { name: 'Organic', value: 28, color: '#10b981' },
  { name: 'Referral', value: 20, color: '#f59e0b' },
  { name: 'Social', value: 17, color: '#ef4444' },
]

const deviceData = [
  { device: 'Desktop', sessions: 4200 },
  { device: 'Mobile', sessions: 3100 },
  { device: 'Tablet', sessions: 900 },
]

const kpiCards = [
  { label: 'Avg Session Duration', value: '4m 32s', change: '+8%', up: true },
  { label: 'Bounce Rate', value: '32.4%', change: '-3.1%', up: true },
  { label: 'Pages / Session', value: '6.2', change: '+12%', up: true },
  { label: 'Conversion Rate', value: '3.8%', change: '+0.4%', up: true },
]

export default function AnalyticsPage() {
  const { isDark } = useTheme()
  const gridColor = isDark ? '#1e2535' : '#f1f5f9'
  const textColor = isDark ? '#64748b' : '#94a3b8'
  const tooltipStyle = {
    backgroundColor: isDark ? '#16192A' : '#fff',
    border: `1px solid ${isDark ? '#242a37' : '#e2e8f0'}`,
    borderRadius: '12px',
    fontSize: '12px',
    color: isDark ? '#f1f5f9' : '#0f172a',
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-app">Analytics</h1>
        <p className="text-muted text-sm mt-1">Platform performance — 2024 overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <p className="text-xs text-muted font-medium">{kpi.label}</p>
            <p className="font-display font-bold text-xl text-app mt-1">{kpi.value}</p>
            <span className={`text-xs font-semibold ${kpi.up ? 'text-emerald-500' : 'text-red-500'}`}>
              {kpi.change} vs last month
            </span>
          </div>
        ))}
      </div>

      {/* Multi-metric line chart */}
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="font-display font-bold text-lg text-app">Multi-Metric Trend</h2>
          <p className="text-muted text-sm">Revenue, users and sessions over 12 months</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
            <Line type="monotone" dataKey="revenue" stroke="#5865f2" strokeWidth={2.5} dot={false} name="Revenue ($)" />
            <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} dot={false} name="Sessions" />
            <Line type="monotone" dataKey="users" stroke="#f59e0b" strokeWidth={2} dot={false} name="Users" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Traffic sources pie */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="font-display font-bold text-lg text-app">Traffic Sources</h2>
            <p className="text-muted text-sm">Distribution by channel</p>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={trafficSources} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {trafficSources.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-shrink-0">
              {trafficSources.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-app">{s.name}</span>
                  <span className="text-sm font-semibold text-app ml-auto pl-4">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device breakdown */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="font-display font-bold text-lg text-app">Device Breakdown</h2>
            <p className="text-muted text-sm">Sessions by device type</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deviceData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="device" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sessions" radius={[6, 6, 0, 0]}>
                {deviceData.map((_, i) => (
                  <Cell key={i} fill={['#5865f2', '#10b981', '#f59e0b'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
