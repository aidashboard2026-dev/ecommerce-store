import React, { useState, useEffect } from 'react'
import {
  Banknote,
  CreditCard,
  Landmark,
  WalletCards,
} from 'lucide-react'

import ToggleSwitch from '@/admin/components/settings/ToggleSwitch'

const iconByName = {
  Razorpay: CreditCard,
  'UPI / PhonePe': Landmark,
  'Cash On Delivery': Banknote,
  PayPal: WalletCards,
}

export default function PaymentMethodCard({
  method,
  loading,
  onToggle,
  onUpdate,
}) {
  const Icon = iconByName[method.name] || WalletCards
  const [descVal, setDescVal] = useState(method.description || '')
  const [feeVal, setFeeVal] = useState(method.fee !== undefined ? String(method.fee) : '0.00')

  useEffect(() => {
    setDescVal(method.description || '')
  }, [method.description])

  useEffect(() => {
    setFeeVal(method.fee !== undefined ? String(method.fee) : '0.00')
  }, [method.fee])

  const handleDescBlur = () => {
    const trimmed = descVal.trim()
    if (trimmed !== (method.description || '')) {
      const updateFn = onUpdate || onToggle
      updateFn?.(method, { description: trimmed })
    }
  }

  const handleFeeBlur = () => {
    const parsed = parseFloat(feeVal)
    if (!isNaN(parsed) && parsed >= 0 && parsed !== Number(method.fee)) {
      const updateFn = onUpdate || onToggle
      updateFn?.(method, { fee: parsed })
    } else {
      setFeeVal(Number(method.fee).toFixed(2))
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

        <ToggleSwitch
          checked={method.is_active}
          loading={loading}
          label={`${method.name} active`}
          onChange={(value) => {
            const updateFn = onUpdate || onToggle
            updateFn?.(method, { is_active: value })
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-zinc-800">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">
          Processing fee
        </span>

        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={feeVal}
            onChange={(e) => setFeeVal(e.target.value)}
            onBlur={handleFeeBlur}
            className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-xs font-bold text-zinc-950 hover:border-gray-200 hover:bg-gray-50 focus:border-indigo-500 focus:bg-white focus:outline-none dark:text-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:focus:border-indigo-500 dark:focus:bg-zinc-900"
          />
          <span className="font-bold text-zinc-950 dark:text-zinc-50">%</span>
        </div>
      </div>
    </article>
  )
}