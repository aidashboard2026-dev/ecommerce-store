import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CreditCard, Banknote } from "lucide-react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { setPaymentMethod } from "@/storefront/store/checkoutStore";
import { storefrontAPI } from "@/shared/services/api";

export default function PaymentSection() {
  const dispatch = useDispatch();
  const paymentMethod = useSelector((s) => s.checkout.paymentMethod);

  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ["publicPayments"],
    queryFn: async () => {
      const res = await storefrontAPI.getPublicPayments();
      return res.data || [];
    },
  });

  const methods = paymentMethods.map((method) => {
    const isOnline = method.name.toLowerCase() === "online payment";
    return {
      value: isOnline ? "ONLINE" : "COD",
      label: method.name,
      icon: isOnline ? CreditCard : Banknote,
      desc: method.description,
    };
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-32 bg-surface rounded" />
        <div className="h-20 bg-surface rounded-xl" />
        <div className="h-20 bg-surface rounded-xl" />
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div>
        <h2 className="font-display font-bold text-lg text-app mb-4">
          Payment Method
        </h2>
        <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/30 p-4 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            No payment methods are currently available.
          </p>
          <p className="text-xs text-muted mt-1">
            Please contact the store administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <h2 className="font-display font-bold text-lg text-app mb-4">
        Payment Method
      </h2>

      <div className="space-y-3">
        {methods.map(({ value, label, icon: Icon, desc }) => (
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

      {paymentMethod === "ONLINE" && methods.some(m => m.value === "ONLINE") && (
        <div className="mt-4">
          <p className="text-xs text-muted">
            After clicking <strong>Place Order</strong>, you will be redirected
            to the secure <strong>Razorpay Checkout</strong> where you can pay
            using UPI, Credit/Debit Cards, Wallets or Net Banking.
          </p>
        </div>
      )}

      {paymentMethod === "COD" && methods.some(m => m.value === "COD") && (
        <div className="mt-4">
          <p className="text-xs text-muted">
            Pay in cash when your order is delivered to your address.
          </p>
        </div>
      )}
    </div>
  );
}