import React from "react";
import {
  BadgeCheck,
  LogIn,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function EmailVerifiedPage() {
  return (
    <main className="min-h-screen bg-app flex items-center justify-center px-4">
      <section className="w-full max-w-md bg-surface border border-app rounded-3xl p-8 text-center shadow-card">

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <BadgeCheck
            size={44}
            className="text-green-500"
          />
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-500">
          MyDesigner
        </p>

        <h1 className="text-3xl font-bold text-app">
          Email Verified!
        </h1>

        <p className="mt-4 text-sm leading-6 text-muted">
          Your email address has been successfully
          verified. Your MyDesigner account is now
          ready to use.
        </p>

        <Link
          to="/auth/login"
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <LogIn size={17} />

          Continue to Sign In
        </Link>

        <Link
          to="/"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-app px-5 py-3 text-sm font-semibold text-app transition hover:bg-app"
        >
          <ShoppingBag size={17} />

          Continue Shopping
        </Link>

      </section>
    </main>
  );
}