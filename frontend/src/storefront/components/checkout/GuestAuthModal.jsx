import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function GuestAuthModal({ onContinueShopping }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center gap-6 animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* Icon Header */}
        <div className="h-16 w-16 rounded-full bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center text-brand-500 mb-2">
          <ShieldCheck size={32} className="animate-pulse" />
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-2">
          <h2
            id="modal-title"
            className="font-display font-bold text-2xl text-app tracking-tight"
          >
            Complete Your Purchase
          </h2>
          <p
            id="modal-description"
            className="text-sm text-muted leading-relaxed"
          >
            You're almost there!
            <br />
            <br />
            Please sign in or create a free account to securely place your order, track your orders, and save your cart.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-3 mt-2">
          <Link
            to="/login"
            state={{ from: { pathname: "/checkout" } }}
            className="w-full h-12 flex items-center justify-center bg-brand-500 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 text-white font-semibold text-sm rounded-full shadow-glow-sm transition-colors"
          >
            Sign In
          </Link>

          <Link
            to="/register"
            state={{ from: { pathname: "/checkout" } }}
            className="w-full h-12 flex items-center justify-center bg-surface hover:bg-surface-hover border border-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 text-app font-semibold text-sm rounded-full transition-colors"
          >
            Create Account
          </Link>

          <button
            type="button"
            onClick={onContinueShopping}
            className="w-full h-10 flex items-center justify-center text-muted hover:text-app font-medium text-sm transition-colors"
          >
            Continue Shopping
          </button>
        </div>

        {/* Footer info */}
        <p className="text-xs text-muted/80 border-t border-app w-full pt-4 mt-2">
          Your cart will be preserved.
        </p>
      </div>
    </div>
  );
}
