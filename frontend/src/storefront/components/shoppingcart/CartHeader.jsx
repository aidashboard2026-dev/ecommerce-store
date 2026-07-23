import React from "react";
import { ShoppingCart, X } from "lucide-react";

function CartBadges({ count = 0 }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-[var(--count-bg)] rounded-full text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function CartHeader({ count = 0, onClose }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-app bg-app px-4 sm:px-6 py-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
          {import.meta.env.VITE_STORE_NAME || "My Designers"}
        </p>

        <h2 className="font-display text-lg font-bold text-app">
          Shopping cart
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-app text-app">
          <ShoppingCart size={15} />
          <CartBadges count={count} />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-app hover:bg-surface transition-colors"
          aria-label="Close cart"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}