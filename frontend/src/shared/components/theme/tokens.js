
export const chartColors = {
  grid: { light: '#e2e8f0', dark: '#242a37' },
  axisText: { light: '#64748b', dark: '#94a3b8' },
  tooltipBg: { light: '#ffffff', dark: '#16192A' },
  tooltipBorder: { light: '#e2e8f0', dark: '#242a37' },
  tooltipText: { light: '#0f172a', dark: '#f1f5f9' },
  accent: '#6366f1', // SalesDashboard bar/line fill+stroke
  emptyState: { light: '#e2e8f0', dark: '#242a37' },
};

/**
 * Status/semantic colors used in OrderStatusAnalytics.jsx's order-status
 * breakdown. These have no equivalent anywhere in tailwind.config.js —
 * there is currently no centralized semantic color layer (success/warning/
 * danger/info) in this codebase at all, chart or otherwise. This is the
 * one place they're defined today; centralizing them here is a pure
 * dedup with no conflicting prior definition.
 */
export const statusColors = {
  info: '#6366f1',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
};