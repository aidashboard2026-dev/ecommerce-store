import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Banknote, Smartphone, CreditCard, Wallet, Landmark } from 'lucide-react'
import clsx from 'clsx'
import { setPaymentMethod } from '../../store/checkoutStore'

const METHODS = [
  { value: 'COD', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when your order arrives' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm & more' },
  { value: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
  { value: 'WALLET', label: 'Wallet', icon: Wallet, desc: 'Paytm, Amazon Pay, Mobikwik' },
  { value: 'NETBANKING', label: 'Net Banking', icon: Landmark, desc: 'All major Indian banks' },
]

export default function PaymentSection() {
  const dispatch = useDispatch()
  const paymentMethod = useSelector((s) => s.checkout.paymentMethod)

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-3">
      <h2 className="font-display font-bold text-lg text-app mb-1">Payment Method</h2>

      {METHODS.map(({ value, label, icon: Icon, desc }) => (
        <button
          key={value}
          type="button"
          onClick={() => dispatch(setPaymentMethod(value))}
          className={clsx(
            'flex items-center gap-4 border rounded-xl p-4 text-left transition-colors',
            paymentMethod === value
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-app hover:border-brand-500/50'
          )}
        >
          <div
            className={clsx(
              'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
              paymentMethod === value ? 'bg-brand-500 text-white' : 'bg-surface text-muted'
            )}
          >
            <Icon size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-app">{label}</p>
            <p className="text-xs text-muted">{desc}</p>
          </div>
          <div
            className={clsx(
              'h-5 w-5 rounded-full border-2 shrink-0',
              paymentMethod === value ? 'border-brand-500 bg-brand-500' : 'border-app'
            )}
          />
        </button>
      ))}

      {paymentMethod !== 'COD' && (
        <div className="bg-surface rounded-xl p-4 mt-1">
          <p className="text-xs text-muted leading-relaxed">
            You'll be redirected to a secure {paymentMethod === 'UPI' ? 'UPI' : paymentMethod === 'CARD' ? 'card' : paymentMethod === 'WALLET' ? 'wallet' : 'net banking'} payment screen on the next step.
          </p>
        </div>
      )}
    </div>
  )
}
