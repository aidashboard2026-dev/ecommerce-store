import React, { useState, useEffect } from 'react'
import {
  Banknote,
  CreditCard,
  WalletCards,
} from 'lucide-react'
import toast from 'react-hot-toast'

import ToggleSwitch from '@/admin/components/settings/ToggleSwitch'

const iconByName = {
  'Online Payment': CreditCard,
  'Cash On Delivery': Banknote,
}

export default function PaymentMethodCard({
  method,
  loading,
  onToggle,
  onUpdate,
}) {
  const Icon = iconByName[method.name] || WalletCards
  const [descVal, setDescVal] = useState(method.description || '')
  const [shippingFeeVal, setShippingFeeVal] = useState(method.fee !== undefined ? String(method.fee) : '0')

  useEffect(() => {
    setDescVal(method.description || '')
  }, [method.description])

  useEffect(() => {
    setShippingFeeVal(method.fee !== undefined ? String(method.fee) : '0')
  }, [method.fee])

  const handleDescBlur = () => {
    const trimmed = descVal.trim()
    if (trimmed !== (method.description || '')) {
      const updateFn = onUpdate || onToggle
      updateFn?.(method, { description: trimmed })
    }
  }

  const handleShippingFeeBlur = () => {
    const val = shippingFeeVal.trim()
    if (val === '') {
      setShippingFeeVal('0')
      onUpdate?.(method, { fee: 0 })
      return
    }
    const parsed = parseFloat(val)
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Shipping fee must be a positive number')
      setShippingFeeVal(method.fee !== undefined ? String(method.fee) : '0')
      return
    }
    if (parsed !== parseFloat(method.fee || 0)) {
      onUpdate?.(method, { fee: parsed })
    }
  }

  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Icon size={19} />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
              {method.name}
            </h3>

            <input
              type="text"
              value={descVal}
              onChange={(e) => setDescVal(e.target.value)}
              onBlur={handleDescBlur}
              className="mt-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-zinc-500 hover:border-gray-200 hover:bg-gray-50 focus:border-indigo-500 focus:bg-white focus:outline-none dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:focus:border-indigo-500 dark:focus:bg-zinc-900"
              placeholder="Enter description..."
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <ToggleSwitch
            checked={method.is_active}
            loading={loading}
            label={`${method.name} active`}
            onChange={(value) => {
              const updateFn = onUpdate || onToggle
              updateFn?.(method, { is_active: value })
            }}
          />

          <div className="flex flex-col items-end gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Shipping Fee
            </label>
            <div className="relative w-24 rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">₹</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingFeeVal}
                onChange={(e) => setShippingFeeVal(e.target.value)}
                onBlur={handleShippingFeeBlur}
                className="w-full rounded-lg border border-gray-200 bg-white py-1 pl-6 pr-2 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}