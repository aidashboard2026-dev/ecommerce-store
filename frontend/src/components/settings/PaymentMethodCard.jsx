import React from 'react'
import {
  Banknote,
  CreditCard,
  Landmark,
  WalletCards,
} from 'lucide-react'

import ToggleSwitch from './ToggleSwitch'

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
}) {
  const Icon = iconByName[method.name] || WalletCards

  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Icon size={19} />
          </span>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
              {method.name}
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {method.description}
            </p>
          </div>
        </div>

        <ToggleSwitch
          checked={method.is_active}
          loading={loading}
          label={`${method.name} active`}
          onChange={(value) => onToggle(method, value)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-zinc-800">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">
          Processing fee
        </span>

        <span className="font-bold text-zinc-950 dark:text-zinc-50">
          {Number(method.fee).toFixed(2)}%
        </span>
      </div>
    </article>
  )
}