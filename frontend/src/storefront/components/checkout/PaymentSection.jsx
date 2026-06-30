import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CreditCard, Banknote } from "lucide-react";
import clsx from "clsx";
import { setPaymentMethod } from "@/storefront/store/checkoutStore";

const METHODS = [
  {
    value: "ONLINE",
    label: "Online Payment",
    icon: CreditCard,
    desc: "Pay securely with Razorpay (UPI, Cards, Wallets, Net Banking)",
  },
  {
    value: "COD",
    label: "Cash on Delivery",
    icon: Banknote,
    desc: "Pay when your order is delivered",
  },
];

export default function PaymentSection() {
  const dispatch = useDispatch();
  const paymentMethod = useSelector((s) => s.checkout.paymentMethod);

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-app mb-4">
        Payment Method
      </h2>

      <div className="space-y-3">
        {METHODS.map(({ value, label, icon: Icon, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => dispatch(setPaymentMethod(value))}
            className={clsx(
              "w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
              paymentMethod === value
                ? "border-brand-500 bg-brand-500/5"
                : "border-app hover:border-brand-500/50"
            )}
          >
            <div
              className={clsx(
                "h-11 w-11 rounded-full flex items-center justify-center",
                paymentMethod === value
                  ? "bg-brand-500 text-white"
                  : "bg-surface text-muted"
              )}
            >
              <Icon size={20} />
            </div>

            <div className="flex-1">
              <p className="font-semibold text-app">{label}</p>
              <p className="text-xs text-muted">{desc}</p>
            </div>

            <div
              className={clsx(
                "h-5 w-5 rounded-full border-2",
                paymentMethod === value
                  ? "border-brand-500 bg-brand-500"
                  : "border-app"
              )}
            />
          </button>
        ))}
      </div>

      {paymentMethod === "ONLINE" && (
        <div className="mt-4 rounded-xl bg-surface border border-app p-4">
          <p className="text-xs text-muted">
            After clicking <strong>Place Order</strong>, you will be redirected
            to the secure <strong>Razorpay Checkout</strong> where you can pay
            using UPI, Credit/Debit Cards, Wallets or Net Banking.
          </p>
        </div>
      )}

      {paymentMethod === "COD" && (
        <div className="mt-4 rounded-xl bg-surface border border-app p-4">
          <p className="text-xs text-muted">
            Pay in cash when your order is delivered to your address.
          </p>
        </div>
      )}
    </div>
  );
}