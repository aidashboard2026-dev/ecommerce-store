import React from 'react'
import { Package, ClipboardCheck, Truck, Home, XCircle } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { key: 'PLACED', label: 'Order Placed', icon: ClipboardCheck },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
]

export default function OrderTimeline({ status, expectedDeliveryDate }) {
  const normalized = (status || 'PLACED').toUpperCase()

  if (normalized === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <XCircle size={22} className="text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-500">Order Cancelled</p>
          <p className="text-xs text-muted">This order has been cancelled.</p>
        </div>
      </div>
    )
  }

  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === normalized))

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isComplete = i <= currentIndex
          const isLast = i === STEPS.length - 1
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={clsx(
                    'h-9 w-9 rounded-full flex items-center justify-center transition-colors',
                    isComplete ? 'bg-brand-500 text-white shadow-glow-sm' : 'bg-surface text-muted'
                  )}
                >
                  <Icon size={16} />
                </div>
                <span
                  className={clsx(
                    'text-[10px] sm:text-xs text-center font-medium',
                    isComplete ? 'text-app' : 'text-muted'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={clsx(
                    'h-0.5 flex-1 -mt-5 transition-colors',
                    i < currentIndex ? 'bg-brand-500' : 'bg-surface'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {expectedDeliveryDate && normalized !== 'DELIVERED' && (
        <p className="text-xs text-muted text-center mt-4">
          Expected delivery: {new Date(expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}
